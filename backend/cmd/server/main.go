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
	"meetup/internal/repository"
	"meetup/internal/service"
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

	ctx := context.Background()
	db.Migrate(ctx, pool)

	// Repositories
	userRepo := repository.NewUserRepository(pool)
	eventRepo := repository.NewEventRepository(pool)
	collectionRepo := repository.NewCollectionRepository(pool)
	pollRepo := repository.NewPollRepository(pool)
	itemRepo := repository.NewItemRepository(pool)
	carpoolRepo := repository.NewCarpoolRepository(pool)
	notificationRepo := repository.NewNotificationRepository(pool)

	// Services
	authSvc := service.NewAuthService(userRepo, cfg.JWTSecret, cfg.JWTExpHours)
	eventSvc := service.NewEventService(eventRepo, userRepo, notificationRepo)
	collectionSvc := service.NewCollectionService(collectionRepo, eventRepo)
	pollSvc := service.NewPollService(pollRepo, eventRepo)
	itemSvc := service.NewItemService(itemRepo, eventRepo)
	carpoolSvc := service.NewCarpoolService(carpoolRepo, eventRepo)
	notificationSvc := service.NewNotificationService(notificationRepo)

	// Handlers
	authH := handler.NewAuthHandler(authSvc)
	eventH := handler.NewEventHandler(eventSvc)
	collectionH := handler.NewCollectionHandler(collectionSvc)
	pollH := handler.NewPollHandler(pollSvc)
	itemH := handler.NewItemHandler(itemSvc)
	carpoolH := handler.NewCarpoolHandler(carpoolSvc)
	notificationH := handler.NewNotificationHandler(notificationSvc)

	// Router
	router := handler.NewRouter(
		authH,
		eventH,
		collectionH,
		pollH,
		itemH,
		carpoolH,
		notificationH,
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
	log.Println("shutting down server...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("server forced to shutdown: %v", err)
	}

	log.Println("server exited gracefully")
}
