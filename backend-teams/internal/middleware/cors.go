package middleware

import (
	"net/http"

	"github.com/go-chi/cors"
)

// CORS allows the configured origins. For local Teams development the default
// (["*"]) lets any {company}.lvh.me dev host talk to the API. Credentials are
// not used (auth is a Bearer token, not a cookie), so wildcard is safe here.
func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	return cors.Handler(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: false,
		MaxAge:           300,
	})
}
