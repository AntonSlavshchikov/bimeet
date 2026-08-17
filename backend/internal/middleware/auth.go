package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"bimeet/internal/observability"
)

type contextKey string

const (
	userIDKey    contextKey = "userID"
	sessionIDKey contextKey = "sessionID"
)

type SessionValidator interface {
	IsActive(ctx context.Context, userID, sessionID uuid.UUID) (bool, error)
}

// Auth validates the JWT and its stable server-side session. A revoked session
// is rejected immediately, even while the access token itself is unexpired.
func Auth(secret string, sessions SessionValidator) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}

			tokenStr := parts[1]
			token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(secret), nil
			})
			if err != nil || !token.Valid {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}

			sub, err := claims.GetSubject()
			if err != nil || sub == "" {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}

			userID, err := uuid.Parse(sub)
			if err != nil {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}

			sid, ok := claims["sid"].(string)
			if !ok || sid == "" {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}
			sessionID, err := uuid.Parse(sid)
			if err != nil {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}

			active, err := sessions.IsActive(r.Context(), userID, sessionID)
			if err != nil {
				observability.FromContext(r.Context()).Error("validate auth session", "error", err)
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}
			if !active {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), userIDKey, userID)
			ctx = context.WithValue(ctx, sessionIDKey, sessionID)
			// Record the authenticated user for the request-summary log and
			// enrich the context logger so downstream handler/service logs carry
			// user_id alongside the trace correlation fields.
			if rs := reqStateFrom(ctx); rs != nil {
				rs.userID = userID.String()
			}
			ctx = observability.WithLogger(ctx, observability.FromContext(ctx).With(
				"user_id", userID.String(),
				"session_id", sessionID.String(),
			))
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// UserIDFromCtx extracts the authenticated user's UUID from the context.
func UserIDFromCtx(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(userIDKey).(uuid.UUID)
	return id, ok
}

// SessionIDFromCtx extracts the stable server-side session UUID from context.
func SessionIDFromCtx(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(sessionIDKey).(uuid.UUID)
	return id, ok
}

// WithUserID injects a user ID into the context. Used in tests to simulate authenticated requests.
func WithUserID(ctx context.Context, id uuid.UUID) context.Context {
	return context.WithValue(ctx, userIDKey, id)
}

// WithSessionID injects a session ID for authenticated handler tests.
func WithSessionID(ctx context.Context, id uuid.UUID) context.Context {
	return context.WithValue(ctx, sessionIDKey, id)
}
