package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        string
	DSN         string
	JWTSecret   string
	JWTExpHours int
	// SMTP (optional — if SMTPHost is empty, emails are logged but not sent)
	SMTPHost    string
	SMTPPort    string
	SMTPUser    string
	SMTPPass    string
	SMTPFrom    string
	FrontendURL string
}

func Load() Config {
	// Load .env file if it exists; ignore error if not found
	_ = godotenv.Load()

	expHours := 72
	if v := os.Getenv("JWT_EXP_HOURS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			expHours = n
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	smtpPort := os.Getenv("SMTP_PORT")
	if smtpPort == "" {
		smtpPort = "587"
	}
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}

	return Config{
		Port:        port,
		DSN:         os.Getenv("DSN"),
		JWTSecret:   os.Getenv("JWT_SECRET"),
		JWTExpHours: expHours,
		SMTPHost:    os.Getenv("SMTP_HOST"),
		SMTPPort:    smtpPort,
		SMTPUser:    os.Getenv("SMTP_USER"),
		SMTPPass:    os.Getenv("SMTP_PASS"),
		SMTPFrom:    os.Getenv("SMTP_FROM"),
		FrontendURL: frontendURL,
	}
}
