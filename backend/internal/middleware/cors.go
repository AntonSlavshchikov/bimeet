package middleware

import (
	"net/http"

	"github.com/go-chi/cors"
)

// CORS returns a CORS middleware. When allowedOrigins is empty it falls back to
// a permissive "*" suitable for development; in production pass an explicit list
// (from CORS_ALLOWED_ORIGINS) to restrict cross-origin access.
func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	origins := allowedOrigins
	if len(origins) == 0 {
		origins = []string{"*"}
	}
	return cors.Handler(cors.Options{
		AllowedOrigins:   origins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300,
	})
}
