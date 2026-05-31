package config

import (
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        string
	DSN         string
	JWTSecret   string
	JWTExpHours int
	// Mail provider:
	//   1. If ResendAPIKey set → Resend HTTP API (port 443, works on any network)
	//   2. Else if SMTPHost set → SMTP (mailhog locally / SendGrid etc.)
	//   3. Else emails are only logged
	ResendAPIKey string
	MailFrom     string // canonical "From:" — falls back to SMTPFrom
	SMTPHost     string
	SMTPPort     string
	SMTPUser     string
	SMTPPass     string
	SMTPFrom     string
	FrontendURL  string
	// S3-compatible storage (optional — if S3Bucket is empty, avatar uploads are disabled)
	AWSRegion        string
	AWSAccessKeyID   string
	AWSSecretKey     string
	S3Bucket         string
	S3PublicBaseURL  string
	S3Endpoint       string // custom endpoint for MinIO / S3-compatible services
	// AdminEmails — whitelist of users (by email) allowed to access /api/admin/*
	AdminEmails []string
	// AppEnv — "development" (default) or "production". In production CORS is
	// restricted to CORSAllowedOrigins and HSTS is enabled.
	AppEnv string
	// CORSAllowedOrigins — explicit list of allowed origins. Empty falls back to
	// a permissive "*" (development only).
	CORSAllowedOrigins []string
	// Web Push (VAPID). If VAPIDPublicKey/PrivateKey are empty, push is disabled.
	VAPIDPublicKey  string
	VAPIDPrivateKey string
	VAPIDSubject    string // "mailto:..." contact for push services
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

	mailFrom := os.Getenv("MAIL_FROM")
	if mailFrom == "" {
		mailFrom = os.Getenv("SMTP_FROM")
	}

	vapidSubject := os.Getenv("VAPID_SUBJECT")
	if vapidSubject == "" {
		vapidSubject = "mailto:admin@bimeet.pro"
	}

	appEnv := strings.ToLower(strings.TrimSpace(os.Getenv("APP_ENV")))
	if appEnv == "" {
		appEnv = "development"
	}

	return Config{
		Port:         port,
		DSN:          os.Getenv("DSN"),
		JWTSecret:    os.Getenv("JWT_SECRET"),
		JWTExpHours:  expHours,
		ResendAPIKey: os.Getenv("RESEND_API_KEY"),
		MailFrom:     mailFrom,
		SMTPHost:     os.Getenv("SMTP_HOST"),
		SMTPPort:     smtpPort,
		SMTPUser:     os.Getenv("SMTP_USER"),
		SMTPPass:     os.Getenv("SMTP_PASS"),
		SMTPFrom:     os.Getenv("SMTP_FROM"),
		FrontendURL:  frontendURL,
		AWSRegion:       os.Getenv("AWS_REGION"),
		AWSAccessKeyID:  os.Getenv("AWS_ACCESS_KEY_ID"),
		AWSSecretKey:    os.Getenv("AWS_SECRET_ACCESS_KEY"),
		S3Bucket:        os.Getenv("S3_BUCKET"),
		S3PublicBaseURL: os.Getenv("S3_PUBLIC_BASE_URL"),
		S3Endpoint:      os.Getenv("S3_ENDPOINT"),
		AdminEmails:        parseAdminEmails(os.Getenv("ADMIN_EMAILS")),
		AppEnv:             appEnv,
		CORSAllowedOrigins: parseCSV(os.Getenv("CORS_ALLOWED_ORIGINS")),
		VAPIDPublicKey:  os.Getenv("VAPID_PUBLIC_KEY"),
		VAPIDPrivateKey: os.Getenv("VAPID_PRIVATE_KEY"),
		VAPIDSubject:    vapidSubject,
	}
}

// IsProduction reports whether the service runs with APP_ENV=production.
func (c Config) IsProduction() bool {
	return c.AppEnv == "production"
}

func parseAdminEmails(raw string) []string {
	emails := parseCSV(raw)
	for i, e := range emails {
		emails[i] = strings.ToLower(e)
	}
	return emails
}

// parseCSV splits a comma-separated env value, trimming whitespace and dropping
// empty entries. Returns nil for an empty input.
func parseCSV(raw string) []string {
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	result := make([]string, 0, len(parts))
	for _, p := range parts {
		if v := strings.TrimSpace(p); v != "" {
			result = append(result, v)
		}
	}
	return result
}
