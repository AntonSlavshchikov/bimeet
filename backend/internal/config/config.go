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

	return Config{
		Port:        port,
		DSN:         os.Getenv("DSN"),
		JWTSecret:   os.Getenv("JWT_SECRET"),
		JWTExpHours: expHours,
	}
}
