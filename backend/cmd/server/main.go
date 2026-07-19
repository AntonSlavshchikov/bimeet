package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"bimeet/internal/config"
	"bimeet/internal/db"
	"bimeet/internal/handler"
	adminhandler "bimeet/internal/handler/admin"
	authhandler "bimeet/internal/handler/auth"
	carpoolhandler "bimeet/internal/handler/carpool"
	collectionhandler "bimeet/internal/handler/collection"
	eventhandler "bimeet/internal/handler/event"
	itemhandler "bimeet/internal/handler/item"
	messagehandler "bimeet/internal/handler/message"
	notificationhandler "bimeet/internal/handler/notification"
	pollhandler "bimeet/internal/handler/poll"
	profilehandler "bimeet/internal/handler/profile"
	pushhandler "bimeet/internal/handler/push"
	"bimeet/internal/notify"
	"bimeet/internal/observability"
	"bimeet/internal/reminder"
	adminrepo "bimeet/internal/repository/admin"
	carpoolrepo "bimeet/internal/repository/carpool"
	collectionrepo "bimeet/internal/repository/collection"
	eventrepo "bimeet/internal/repository/event"
	itemrepo "bimeet/internal/repository/item"
	loginrepo "bimeet/internal/repository/loginrepo"
	messagerepo "bimeet/internal/repository/message"
	notificationrepo "bimeet/internal/repository/notification"
	pollrepo "bimeet/internal/repository/poll"
	pushsubrepo "bimeet/internal/repository/pushsub"
	userrepo "bimeet/internal/repository/user"
	"bimeet/internal/secret"
	adminsvc "bimeet/internal/service/admin"
	authsvc "bimeet/internal/service/auth"
	carpoolsvc "bimeet/internal/service/carpool"
	collectionsvc "bimeet/internal/service/collection"
	eventsvc "bimeet/internal/service/event"
	itemsvc "bimeet/internal/service/item"
	"bimeet/internal/service/mailer"
	messagesvc "bimeet/internal/service/message"
	notificationsvc "bimeet/internal/service/notification"
	pollsvc "bimeet/internal/service/poll"
	profilesvc "bimeet/internal/service/profile"
	pushsvc "bimeet/internal/service/push"
	"bimeet/internal/storage"

	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// @title Bimeet API
// @version 1.0
// @description Backend API for Bimeet events, invitations, collections, polls, chat, profile, push notifications, and admin dashboards.
// @BasePath /api
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer " followed by a JWT token.
func main() {
	cfg := config.Load()

	// Structured logging first, so every subsequent line is structured.
	observability.InitLogger(cfg.LogFormat, cfg.LogLevel)

	if cfg.DSN == "" {
		fatal("DSN environment variable is required")
	}
	if cfg.JWTSecret == "" {
		fatal("JWT_SECRET environment variable is required")
	}

	ctx, stop := context.WithCancel(context.Background())
	defer stop()

	// OpenTelemetry tracing. Disabled by default → no-op provider, zero overhead.
	shutdownTracing, err := observability.InitTracing(ctx, observability.TracingConfig{
		Enabled:     cfg.OTelEnabled,
		ServiceName: cfg.OTelServiceName,
		Environment: cfg.AppEnv,
		Endpoint:    cfg.OTelEndpoint,
	})
	if err != nil {
		fatal("init tracing", "error", err)
	}
	defer func() {
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := shutdownTracing(shutdownCtx); err != nil {
			slog.Error("shutdown tracing", "error", err)
		}
	}()
	if cfg.OTelEnabled {
		slog.Info("tracing enabled", "endpoint", cfg.OTelEndpoint, "service", cfg.OTelServiceName)
	} else {
		slog.Info("tracing disabled")
	}

	pool, err := db.Connect(cfg.DSN)
	if err != nil {
		fatal("connect to database", "error", err)
	}
	defer pool.Close()

	db.Migrate(ctx, pool)

	// Repositories
	userRepo := userrepo.New(pool)
	eventRepo := eventrepo.New(pool)
	collectionRepo := collectionrepo.New(pool)
	pollRepo := pollrepo.New(pool)
	itemRepo := itemrepo.New(pool)
	carpoolRepo := carpoolrepo.New(pool)
	chatCipher, err := secret.New(cfg.ChatEncryptionKey)
	if err != nil {
		fatal("init chat encryption", "error", err)
	}
	if chatCipher.Enabled() {
		slog.Info("chat message encryption enabled")
	} else {
		slog.Info("chat message encryption disabled (CHAT_ENCRYPTION_KEY not set)")
	}
	messageRepo := messagerepo.New(pool, chatCipher)
	notificationRepo := notificationrepo.New(pool)
	loginCodeRepo := loginrepo.New(pool)
	pushSubRepo := pushsubrepo.New(pool)
	adminRepo := adminrepo.New(pool)

	// Web Push service + decorator: wrap notificationRepo so every persisted
	// notification also fans out as a push (works for all existing callers).
	pushSvc := pushsvc.New(pushSubRepo, pushsvc.Config{
		PublicKey:  cfg.VAPIDPublicKey,
		PrivateKey: cfg.VAPIDPrivateKey,
		Subject:    cfg.VAPIDSubject,
	})
	notifyingRepo := notify.New(notificationRepo, pushSvc)
	if pushSvc.Enabled() {
		slog.Info("web push enabled")
	} else {
		slog.Info("web push disabled (VAPID keys not set)")
	}

	// Services
	m := mailer.New(mailer.Config{
		ResendAPIKey: cfg.ResendAPIKey,
		MailFrom:     cfg.MailFrom,
		SMTPHost:     cfg.SMTPHost,
		SMTPPort:     cfg.SMTPPort,
		SMTPUser:     cfg.SMTPUser,
		SMTPPass:     cfg.SMTPPass,
		SMTPFrom:     cfg.SMTPFrom,
		FrontendURL:  cfg.FrontendURL,
	})
	authSvc := authsvc.New(userRepo, loginCodeRepo, m, cfg.JWTSecret, cfg.JWTExpHours, cfg.AuthTest)
	eventSvc := eventsvc.New(eventRepo, userRepo, notifyingRepo, m)
	pollSvc := pollsvc.New(pollRepo, eventRepo)
	itemSvc := itemsvc.New(itemRepo, eventRepo)
	carpoolSvc := carpoolsvc.New(carpoolRepo, eventRepo)
	notificationSvc := notificationsvc.New(notificationRepo)
	adminSvc := adminsvc.New(adminRepo)

	// S3 storage for avatars, receipts, and chat images
	var fileStorage interface {
		profilesvc.AvatarStorage
		collectionsvc.Uploader
		messagesvc.Uploader
	}
	if cfg.S3Bucket != "" {
		awsCfg, err := awsconfig.LoadDefaultConfig(ctx,
			awsconfig.WithRegion(cfg.AWSRegion),
			awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
				cfg.AWSAccessKeyID, cfg.AWSSecretKey, "",
			)),
		)
		if err != nil {
			fatal("load aws config", "error", err)
		}
		s3Opts := []func(*s3.Options){}
		if cfg.S3Endpoint != "" {
			s3Opts = append(s3Opts, func(o *s3.Options) {
				o.BaseEndpoint = &cfg.S3Endpoint
				o.UsePathStyle = true // required for MinIO
			})
		}
		fileStorage = storage.NewS3(s3.NewFromConfig(awsCfg, s3Opts...), cfg.S3Bucket, cfg.S3PublicBaseURL)
	} else {
		slog.Info("S3_BUCKET not set — file uploads disabled")
		fileStorage = &storage.NoopStorage{}
	}

	profileSvc := profilesvc.New(userRepo, fileStorage)
	collectionSvc := collectionsvc.New(collectionRepo, eventRepo, notifyingRepo, fileStorage)
	messageSvc := messagesvc.New(messageRepo, eventRepo, notifyingRepo, fileStorage)

	// Handlers
	authH := authhandler.New(authSvc)
	eventH := eventhandler.New(eventSvc)
	collectionH := collectionhandler.New(collectionSvc)
	pollH := pollhandler.New(pollSvc)
	itemH := itemhandler.New(itemSvc)
	carpoolH := carpoolhandler.New(carpoolSvc)
	messageH := messagehandler.New(messageSvc)
	notificationH := notificationhandler.New(notificationSvc)
	profileH := profilehandler.New(profileSvc)
	adminH := adminhandler.New(adminSvc)
	pushH := pushhandler.New(pushSvc)

	// Reminder scheduler
	reminderRunner := reminder.New(eventRepo, notifyingRepo, time.Hour)
	go reminderRunner.Start(ctx)

	// Router
	router := handler.NewRouter(
		authH,
		eventH,
		collectionH,
		pollH,
		itemH,
		carpoolH,
		messageH,
		notificationH,
		profileH,
		adminH,
		pushH,
		userRepo,
		cfg.AdminEmails,
		cfg.JWTSecret,
		cfg.CORSAllowedOrigins,
		cfg.IsProduction(),
		cfg.OTelServiceName,
	)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadTimeout:       15 * time.Second,
		ReadHeaderTimeout: 10 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	go func() {
		slog.Info("server listening", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			fatal("listen", "error", err)
		}
	}()

	<-quit
	stop() // cancel context → stops reminder runner
	slog.Info("shutting down server...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		fatal("server forced to shutdown", "error", err)
	}

	slog.Info("server exited gracefully")
}

// fatal logs a structured error and exits. slog has no Fatal helper, so this
// mirrors log.Fatal for the handful of unrecoverable startup conditions.
func fatal(msg string, args ...any) {
	slog.Error(msg, args...)
	os.Exit(1)
}
