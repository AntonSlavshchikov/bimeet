package middleware_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"bimeet/internal/middleware"
)

type stubSessionValidator struct {
	active bool
	err    error
}

func (s stubSessionValidator) IsActive(context.Context, uuid.UUID, uuid.UUID) (bool, error) {
	return s.active, s.err
}

func signedToken(t *testing.T, userID uuid.UUID, sessionID *uuid.UUID) string {
	t.Helper()
	claims := jwt.MapClaims{
		"sub": userID.String(),
		"exp": time.Now().Add(time.Hour).Unix(),
	}
	if sessionID != nil {
		claims["sid"] = sessionID.String()
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte("secret"))
	require.NoError(t, err)
	return token
}

func TestAuth_AcceptsActiveSessionAndSetsContext(t *testing.T) {
	userID := uuid.New()
	sessionID := uuid.New()
	var gotUserID, gotSessionID uuid.UUID
	h := middleware.Auth("secret", stubSessionValidator{active: true})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotUserID, _ = middleware.UserIDFromCtx(r.Context())
		gotSessionID, _ = middleware.SessionIDFromCtx(r.Context())
		w.WriteHeader(http.StatusNoContent)
	}))
	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+signedToken(t, userID, &sessionID))
	w := httptest.NewRecorder()

	h.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNoContent, w.Code)
	assert.Equal(t, userID, gotUserID)
	assert.Equal(t, sessionID, gotSessionID)
}

func TestAuth_RejectsRevokedSession(t *testing.T) {
	userID := uuid.New()
	sessionID := uuid.New()
	h := middleware.Auth("secret", stubSessionValidator{active: false})(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		t.Fatal("next handler must not be called")
	}))
	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+signedToken(t, userID, &sessionID))
	w := httptest.NewRecorder()

	h.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestAuth_RejectsLegacyTokenWithoutSessionID(t *testing.T) {
	userID := uuid.New()
	h := middleware.Auth("secret", stubSessionValidator{active: true})(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		t.Fatal("next handler must not be called")
	}))
	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+signedToken(t, userID, nil))
	w := httptest.NewRecorder()

	h.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}
