package middleware_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"

	"bimeet/internal/middleware"
)

func corsResponse(t *testing.T, origins []string, reqOrigin string) string {
	t.Helper()
	rec := httptest.NewRecorder()
	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/", nil)
	req.Header.Set("Origin", reqOrigin)
	middleware.CORS(origins)(okHandler()).ServeHTTP(rec, req)
	return rec.Header().Get("Access-Control-Allow-Origin")
}

func TestCORS_DevFallbackAllowsLocalFrontend(t *testing.T) {
	got := corsResponse(t, nil, "http://localhost:5173")
	assert.Equal(t, "http://localhost:5173", got)
}

func TestCORS_DevFallbackBlocksOtherOrigins(t *testing.T) {
	got := corsResponse(t, nil, "http://evil.example")
	assert.Empty(t, got)
}

func TestCORS_RestrictedAllowsListedOrigin(t *testing.T) {
	got := corsResponse(t, []string{"https://app.bimeet.pro"}, "https://app.bimeet.pro")
	assert.Equal(t, "https://app.bimeet.pro", got)
}

func TestCORS_RestrictedBlocksUnlistedOrigin(t *testing.T) {
	got := corsResponse(t, []string{"https://app.bimeet.pro"}, "http://evil.example")
	assert.Empty(t, got)
}
