package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"bimeet/internal/config"
	"bimeet/internal/db"
	"bimeet/internal/handler"
	adminhandler        "bimeet/internal/handler/admin"
	authhandler         "bimeet/internal/handler/auth"
	carpoolhandler      "bimeet/internal/handler/carpool"
	collectionhandler   "bimeet/internal/handler/collection"
	eventhandler        "bimeet/internal/handler/event"
	eventlinkhandler    "bimeet/internal/handler/eventlink"
	itemhandler         "bimeet/internal/handler/item"
	notificationhandler "bimeet/internal/handler/notification"
	pollhandler         "bimeet/internal/handler/poll"
	profilehandler      "bimeet/internal/handler/profile"
	adminrepo           "bimeet/internal/repository/admin"
	carpoolrepo         "bimeet/internal/repository/carpool"
	collectionrepo      "bimeet/internal/repository/collection"
	eventrepo           "bimeet/internal/repository/event"
	eventlinkrepo       "bimeet/internal/repository/eventlink"
	itemrepo            "bimeet/internal/repository/item"
	notificationrepo    "bimeet/internal/repository/notification"
	passwordresetrepo   "bimeet/internal/repository/passwordreset"
	pollrepo            "bimeet/internal/repository/poll"
	userrepo            "bimeet/internal/repository/user"
	adminsvc            "bimeet/internal/service/admin"
	authsvc             "bimeet/internal/service/auth"
	carpoolsvc          "bimeet/internal/service/carpool"
	collectionsvc       "bimeet/internal/service/collection"
	eventsvc            "bimeet/internal/service/event"
	eventlinksvc        "bimeet/internal/service/eventlink"
	itemsvc             "bimeet/internal/service/item"
	"bimeet/internal/service/mailer"
	notificationsvc     "bimeet/internal/service/notification"
	pollsvc             "bimeet/internal/service/poll"
	profilesvc          "bimeet/internal/service/profile"
	"bimeet/internal/reminder"
	"bimeet/internal/storage"

	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

func main() {
	cfg := config.Load()

	if cfg.DSN == "" {
		log.Fatal("DSN environment variable is required")
	}
	if cfg.JWTSecret == "" {
		log.Fatal("JWT_SECRET environment variable is required")
	}

	pool, err := db.Connect(cfg.DSN)
	if err != nil {
		log.Fatalf("connect to database: %v", err)
	}
	defer pool.Close()

	ctx, stop := context.WithCancel(context.Background())
	defer stop()
	db.Migrate(ctx, pool)

	// Repositories
	userRepo          := userrepo.New(pool)
	eventRepo         := eventrepo.New(pool)
	collectionRepo    := collectionrepo.New(pool)
	pollRepo          := pollrepo.New(pool)
	itemRepo          := itemrepo.New(pool)
	carpoolRepo       := carpoolrepo.New(pool)
	linkRepo          := eventlinkrepo.New(pool)
	notificationRepo  := notificationrepo.New(pool)
	passwordResetRepo := passwordresetrepo.New(pool)
	adminRepo         := adminrepo.New(pool)

	// Services
	m            := mailer.New(mailer.Config{
		ResendAPIKey: cfg.ResendAPIKey,
		MailFrom:     cfg.MailFrom,
		SMTPHost:     cfg.SMTPHost,
		SMTPPort:     cfg.SMTPPort,
		SMTPUser:     cfg.SMTPUser,
		SMTPPass:     cfg.SMTPPass,
		SMTPFrom:     cfg.SMTPFrom,
		FrontendURL:  cfg.FrontendURL,
	})
	authSvc         := authsvc.New(userRepo, passwordResetRepo, m, cfg.JWTSecret, cfg.JWTExpHours)
	eventSvc        := eventsvc.New(eventRepo, userRepo, notificationRepo, m)
	pollSvc         := pollsvc.New(pollRepo, eventRepo)
	itemSvc         := itemsvc.New(itemRepo, eventRepo)
	carpoolSvc      := carpoolsvc.New(carpoolRepo, eventRepo)
	linkSvc         := eventlinksvc.New(linkRepo, eventRepo)
	notificationSvc := notificationsvc.New(notificationRepo)
	adminSvc        := adminsvc.New(adminRepo)

	// S3 storage for avatars and receipts
	var fileStorage interface {
		profilesvc.AvatarStorage
		collectionsvc.Uploader
	}
	if cfg.S3Bucket != "" {
		awsCfg, err := awsconfig.LoadDefaultConfig(ctx,
			awsconfig.WithRegion(cfg.AWSRegion),
			awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
				cfg.AWSAccessKeyID, cfg.AWSSecretKey, "",
			)),
		)
		if err != nil {
			log.Fatalf("load aws config: %v", err)
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
		log.Println("S3_BUCKET not set — file uploads disabled")
		fileStorage = &storage.NoopStorage{}
	}

	profileSvc    := profilesvc.New(userRepo, fileStorage)
	collectionSvc := collectionsvc.New(collectionRepo, eventRepo, notificationRepo, fileStorage)

	// Handlers
	authH         := authhandler.New(authSvc)
	eventH        := eventhandler.New(eventSvc)
	collectionH   := collectionhandler.New(collectionSvc)
	pollH         := pollhandler.New(pollSvc)
	itemH         := itemhandler.New(itemSvc)
	carpoolH      := carpoolhandler.New(carpoolSvc)
	linkH         := eventlinkhandler.New(linkSvc)
	notificationH := notificationhandler.New(notificationSvc)
	profileH      := profilehandler.New(profileSvc)
	adminH        := adminhandler.New(adminSvc)

	// Reminder scheduler
	reminderRunner := reminder.New(eventRepo, notificationRepo, time.Hour)
	go reminderRunner.Start(ctx)

	// Router
	router := handler.NewRouter(
		authH,
		eventH,
		collectionH,
		pollH,
		itemH,
		carpoolH,
		linkH,
		notificationH,
		profileH,
		adminH,
		userRepo,
		cfg.AdminEmails,
		cfg.JWTSecret,
	)

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("server listening on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	<-quit
	stop() // cancel context → stops reminder runner
	log.Println("shutting down server...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("server forced to shutdown: %v", err)
	}

	log.Println("server exited gracefully")
}
