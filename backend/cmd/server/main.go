package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"meetup/internal/config"
	"meetup/internal/db"
	"meetup/internal/handler"
	authhandler         "meetup/internal/handler/auth"
	carpoolhandler      "meetup/internal/handler/carpool"
	collectionhandler   "meetup/internal/handler/collection"
	eventhandler        "meetup/internal/handler/event"
	eventlinkhandler    "meetup/internal/handler/eventlink"
	itemhandler         "meetup/internal/handler/item"
	notificationhandler "meetup/internal/handler/notification"
	pollhandler         "meetup/internal/handler/poll"
	profilehandler      "meetup/internal/handler/profile"
	carpoolrepo         "meetup/internal/repository/carpool"
	collectionrepo      "meetup/internal/repository/collection"
	eventrepo           "meetup/internal/repository/event"
	eventlinkrepo       "meetup/internal/repository/eventlink"
	itemrepo            "meetup/internal/repository/item"
	notificationrepo    "meetup/internal/repository/notification"
	pollrepo            "meetup/internal/repository/poll"
	userrepo            "meetup/internal/repository/user"
	authsvc             "meetup/internal/service/auth"
	carpoolsvc          "meetup/internal/service/carpool"
	collectionsvc       "meetup/internal/service/collection"
	eventsvc            "meetup/internal/service/event"
	eventlinksvc        "meetup/internal/service/eventlink"
	itemsvc             "meetup/internal/service/item"
	"meetup/internal/service/mailer"
	notificationsvc     "meetup/internal/service/notification"
	pollsvc             "meetup/internal/service/poll"
	profilesvc          "meetup/internal/service/profile"
	"meetup/internal/reminder"
	"meetup/internal/storage"

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
	userRepo         := userrepo.New(pool)
	eventRepo        := eventrepo.New(pool)
	collectionRepo   := collectionrepo.New(pool)
	pollRepo         := pollrepo.New(pool)
	itemRepo         := itemrepo.New(pool)
	carpoolRepo      := carpoolrepo.New(pool)
	linkRepo         := eventlinkrepo.New(pool)
	notificationRepo := notificationrepo.New(pool)

	// Services
	m            := mailer.New(mailer.Config{
		Host:        cfg.SMTPHost,
		Port:        cfg.SMTPPort,
		User:        cfg.SMTPUser,
		Pass:        cfg.SMTPPass,
		From:        cfg.SMTPFrom,
		FrontendURL: cfg.FrontendURL,
	})
	authSvc         := authsvc.New(userRepo, cfg.JWTSecret, cfg.JWTExpHours)
	eventSvc        := eventsvc.New(eventRepo, userRepo, notificationRepo, m)
	collectionSvc   := collectionsvc.New(collectionRepo, eventRepo)
	pollSvc         := pollsvc.New(pollRepo, eventRepo)
	itemSvc         := itemsvc.New(itemRepo, eventRepo)
	carpoolSvc      := carpoolsvc.New(carpoolRepo, eventRepo)
	linkSvc         := eventlinksvc.New(linkRepo, eventRepo)
	notificationSvc := notificationsvc.New(notificationRepo)

	// S3 storage for avatars
	var avatarStorage profilesvc.AvatarStorage
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
		avatarStorage = storage.NewS3(s3.NewFromConfig(awsCfg, s3Opts...), cfg.S3Bucket, cfg.S3PublicBaseURL)
	} else {
		log.Println("S3_BUCKET not set — avatar uploads disabled")
		avatarStorage = &storage.NoopStorage{}
	}

	profileSvc := profilesvc.New(userRepo, avatarStorage)

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
