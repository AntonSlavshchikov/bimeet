package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type contextKey string

const (
	userIDKey    contextKey = "userID"
	companyIDKey contextKey = "companyID"
	roleKey      contextKey = "role"
)

// Auth validates the JWT Bearer token and stores userID, companyID and role in
// the request context. Unlike the People backend, a Teams token always carries
// the company and role claims — the company is the security boundary.
func Auth(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
				unauthorized(w)
				return
			}

			token, err := jwt.Parse(parts[1], func(t *jwt.Token) (interface{}, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(secret), nil
			})
			if err != nil || !token.Valid {
				unauthorized(w)
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				unauthorized(w)
				return
			}

			userID, err := uuid.Parse(stringClaim(claims, "sub"))
			if err != nil {
				unauthorized(w)
				return
			}
			companyID, err := uuid.Parse(stringClaim(claims, "company"))
			if err != nil {
				unauthorized(w)
				return
			}
			role := stringClaim(claims, "role")
			if role != "owner" && role != "member" {
				unauthorized(w)
				return
			}

			ctx := context.WithValue(r.Context(), userIDKey, userID)
			ctx = context.WithValue(ctx, companyIDKey, companyID)
			ctx = context.WithValue(ctx, roleKey, role)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireOwner rejects requests from non-owner users with 403.
func RequireOwner(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if RoleFromCtx(r.Context()) != "owner" {
			http.Error(w, `{"error":"owner only"}`, http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func unauthorized(w http.ResponseWriter) {
	http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
}

func stringClaim(claims jwt.MapClaims, key string) string {
	v, _ := claims[key].(string)
	return v
}

// UserIDFromCtx returns the authenticated user's UUID.
func UserIDFromCtx(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(userIDKey).(uuid.UUID)
	return id, ok
}

// CompanyIDFromCtx returns the authenticated user's company UUID.
func CompanyIDFromCtx(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(companyIDKey).(uuid.UUID)
	return id, ok
}

// RoleFromCtx returns the authenticated user's role ("owner"/"member"), or "".
func RoleFromCtx(ctx context.Context) string {
	role, _ := ctx.Value(roleKey).(string)
	return role
}
