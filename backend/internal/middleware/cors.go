package middleware

import (
	"net/http"

	"github.com/go-chi/cors"
)

// CORS returns a CORS middleware. When allowedOrigins is empty it falls back to
// the local Vite origin. Credentialed requests require an explicit origin rather
// than "*" so the browser can send the HttpOnly refresh-token cookie.
func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	origins := allowedOrigins
	if len(origins) == 0 {
		origins = []string{"http://localhost:5173"}
	}
	return cors.Handler(cors.Options{
		AllowedOrigins:   origins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	})
}
