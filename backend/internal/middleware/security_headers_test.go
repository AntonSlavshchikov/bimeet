package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"

	"bimeet/internal/middleware"
)

func okHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
}

func TestSecurityHeaders_Baseline(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)

	middleware.SecurityHeaders(false)(okHandler()).ServeHTTP(rec, req)

	h := rec.Header()
	assert.Equal(t, "nosniff", h.Get("X-Content-Type-Options"))
	assert.Equal(t, "DENY", h.Get("X-Frame-Options"))
	assert.Equal(t, "no-referrer", h.Get("Referrer-Policy"))
	assert.Contains(t, h.Get("Content-Security-Policy"), "default-src 'none'")
	// HSTS must NOT be set outside production.
	assert.Empty(t, h.Get("Strict-Transport-Security"))
}

func TestSecurityHeaders_HSTSInProduction(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)

	middleware.SecurityHeaders(true)(okHandler()).ServeHTTP(rec, req)

	assert.Contains(t, rec.Header().Get("Strict-Transport-Security"), "max-age=63072000")
}
