package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"bimeet/internal/middleware"
)

func TestRateLimitAuth_BlocksAfterLimit(t *testing.T) {
	h := middleware.RateLimitAuth()(okHandler())

	const limit = 10
	var lastStatus int
	for i := 0; i < limit+1; i++ {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/api/auth/login", nil)
		req.RemoteAddr = "9.9.9.9:5555" // same client for every request
		h.ServeHTTP(rec, req)
		lastStatus = rec.Code

		if i < limit {
			require.Equal(t, http.StatusOK, rec.Code, "request %d should pass", i+1)
		}
	}

	assert.Equal(t, http.StatusTooManyRequests, lastStatus, "request beyond the limit must be throttled")
}

func TestRateLimitAuth_SeparateIPsIndependentBuckets(t *testing.T) {
	h := middleware.RateLimitAuth()(okHandler())

	// A different IP gets its own bucket and is not affected by another's usage.
	for i := 0; i < 15; i++ {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/api/auth/login", nil)
		req.RemoteAddr = "1.1.1.1:1000"
		h.ServeHTTP(rec, req)
	}

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", nil)
	req.RemoteAddr = "2.2.2.2:1000"
	h.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusOK, rec.Code)
}
