package config

import (
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

// Config holds runtime configuration for the Teams backend, loaded from the
// environment (with a .env file applied first if present).
type Config struct {
	DSN                string
	JWTSecret          string
	JWTExpHours        int
	Port               string
	CORSAllowedOrigins []string

	// SMTP — local development points at MailHog (no auth).
	SMTPHost string
	SMTPPort string
	SMTPUser string
	SMTPPass string
	MailFrom string

	// Used to build the {subdomain}.{base} accept-invite link inside emails.
	FrontendScheme     string
	FrontendBaseDomain string
}

func Load() Config {
	// Best-effort: load .env if it exists. Missing file is not an error.
	_ = godotenv.Load()

	return Config{
		DSN:                os.Getenv("DSN"),
		JWTSecret:          os.Getenv("JWT_SECRET"),
		JWTExpHours:        parseIntDefault(os.Getenv("JWT_EXP_HOURS"), 72),
		Port:               getenvDefault("PORT", "8090"),
		CORSAllowedOrigins: parseOrigins(os.Getenv("CORS_ALLOWED_ORIGINS")),

		SMTPHost: os.Getenv("SMTP_HOST"),
		SMTPPort: getenvDefault("SMTP_PORT", "1026"),
		SMTPUser: os.Getenv("SMTP_USER"),
		SMTPPass: os.Getenv("SMTP_PASS"),
		MailFrom: getenvDefault("MAIL_FROM", "noreply@bimeet.local"),

		FrontendScheme:     getenvDefault("FRONTEND_SCHEME", "http"),
		FrontendBaseDomain: getenvDefault("FRONTEND_BASE_DOMAIN", "lvh.me:5174"),
	}
}

func getenvDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func parseIntDefault(s string, def int) int {
	if s == "" {
		return def
	}
	n, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	return n
}

// parseOrigins splits a comma-separated list. Empty → a permissive default for
// local development (any *.lvh.me and localhost dev servers).
func parseOrigins(s string) []string {
	if strings.TrimSpace(s) == "" {
		return []string{"*"}
	}
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if v := strings.TrimSpace(p); v != "" {
			out = append(out, v)
		}
	}
	return out
}
