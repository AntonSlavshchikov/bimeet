package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"bimeet-teams/internal/config"
	"bimeet-teams/internal/db"
	"bimeet-teams/internal/handler"
	authhandler "bimeet-teams/internal/handler/auth"
	companyhandler "bimeet-teams/internal/handler/company"
	eventhandler "bimeet-teams/internal/handler/event"
	linkhandler "bimeet-teams/internal/handler/link"
	notificationhandler "bimeet-teams/internal/handler/notification"
	pollhandler "bimeet-teams/internal/handler/poll"
	companyrepo "bimeet-teams/internal/repository/company"
	eventrepo "bimeet-teams/internal/repository/event"
	invitationrepo "bimeet-teams/internal/repository/invitation"
	linkrepo "bimeet-teams/internal/repository/link"
	notificationrepo "bimeet-teams/internal/repository/notification"
	pollrepo "bimeet-teams/internal/repository/poll"
	userrepo "bimeet-teams/internal/repository/user"
	authsvc "bimeet-teams/internal/service/auth"
	companysvc "bimeet-teams/internal/service/company"
	eventsvc "bimeet-teams/internal/service/event"
	linksvc "bimeet-teams/internal/service/link"
	"bimeet-teams/internal/service/mailer"
	notificationsvc "bimeet-teams/internal/service/notification"
	pollsvc "bimeet-teams/internal/service/poll"
)

func main() {
	cfg := config.Load()

	if cfg.DSN == "" {
		fatal("DSN environment variable is required")
	}
	if cfg.JWTSecret == "" {
		fatal("JWT_SECRET environment variable is required")
	}

	ctx, stop := context.WithCancel(context.Background())
	defer stop()

	pool, err := db.Connect(cfg.DSN)
	if err != nil {
		fatal("connect to database", "error", err)
	}
	defer pool.Close()

	db.Migrate(ctx, pool)

	// Repositories
	companyRepo := companyrepo.New(pool)
	userRepo := userrepo.New(pool)
	inviteRepo := invitationrepo.New(pool)
	eventRepo := eventrepo.New(pool)
	pollRepo := pollrepo.New(pool)
	linkRepo := linkrepo.New(pool)
	notificationRepo := notificationrepo.New(pool)

	// Mailer — local dev points at MailHog; with no SMTP host, mail is logged.
	m := mailer.New(mailer.Config{
		SMTPHost: cfg.SMTPHost,
		SMTPPort: cfg.SMTPPort,
		SMTPUser: cfg.SMTPUser,
		SMTPPass: cfg.SMTPPass,
		MailFrom: cfg.MailFrom,
	})

	// Services
	authService := authsvc.New(companyRepo, userRepo, inviteRepo, cfg.JWTSecret, cfg.JWTExpHours)
	companyService := companysvc.New(companyRepo, userRepo, inviteRepo, m, cfg.FrontendScheme, cfg.FrontendBaseDomain)
	eventService := eventsvc.New(eventRepo, userRepo, notificationRepo)
	pollService := pollsvc.New(eventRepo, pollRepo)
	linkService := linksvc.New(eventRepo, linkRepo)
	notificationService := notificationsvc.New(notificationRepo)

	// Handlers
	authH := authhandler.New(authService)
	companyH := companyhandler.New(companyService)
	eventH := eventhandler.New(eventService)
	pollH := pollhandler.New(pollService)
	linkH := linkhandler.New(linkService)
	notificationH := notificationhandler.New(notificationService)

	router := handler.NewRouter(authH, companyH, eventH, pollH, linkH, notificationH, cfg.JWTSecret, cfg.CORSAllowedOrigins)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadTimeout:       15 * time.Second,
		ReadHeaderTimeout: 10 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	go func() {
		slog.Info("teams server listening", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			fatal("listen", "error", err)
		}
	}()

	<-quit
	stop()
	slog.Info("shutting down teams server...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		fatal("server forced to shutdown", "error", err)
	}
	slog.Info("teams server exited gracefully")
}

func fatal(msg string, args ...any) {
	slog.Error(msg, args...)
	os.Exit(1)
}
