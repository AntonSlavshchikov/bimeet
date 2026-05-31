package middleware

import (
	"net/http"
	"time"

	"github.com/go-chi/httprate"
)

// rateLimitExceeded renders the 429 response in the same JSON envelope used by
// the rest of the API.
func rateLimitExceeded(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusTooManyRequests)
	_, _ = w.Write([]byte(`{"error":"too many requests"}`))
}

// RateLimitGlobal throttles every client by IP across the whole API as a coarse
// abuse guard (~300 requests/minute per IP). Relies on RealIP being applied
// earlier so the key is the real client address behind the proxy.
func RateLimitGlobal() func(http.Handler) http.Handler {
	return httprate.Limit(
		300,
		time.Minute,
		httprate.WithKeyFuncs(httprate.KeyByIP),
		httprate.WithLimitHandler(rateLimitExceeded),
	)
}

// RateLimitAuth applies a strict per-IP-and-endpoint limit to authentication
// routes (~10 requests/minute) — the primary brute-force defense for
// login / register / password-reset.
func RateLimitAuth() func(http.Handler) http.Handler {
	return httprate.Limit(
		10,
		time.Minute,
		httprate.WithKeyFuncs(httprate.KeyByIP, httprate.KeyByEndpoint),
		httprate.WithLimitHandler(rateLimitExceeded),
	)
}
