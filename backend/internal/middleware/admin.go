package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"bimeet/internal/model"
)

// UserLookup is the minimal user-loading interface required to enforce admin access.
// Implemented by *userrepo.Repository.
type UserLookup interface {
	GetByID(ctx context.Context, id uuid.UUID) (model.User, error)
}

// RequireAdmin authorizes only users whose email is present in the allowed whitelist.
// Must be chained after Auth, since it relies on userID in context.
func RequireAdmin(users UserLookup, allowed []string) func(http.Handler) http.Handler {
	allowedSet := make(map[string]struct{}, len(allowed))
	for _, e := range allowed {
		allowedSet[strings.ToLower(strings.TrimSpace(e))] = struct{}{}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, ok := UserIDFromCtx(r.Context())
			if !ok {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}

			u, err := users.GetByID(r.Context(), userID)
			if err != nil {
				http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
				return
			}

			email := strings.ToLower(strings.TrimSpace(u.Email))
			if _, allowed := allowedSet[email]; !allowed {
				http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
