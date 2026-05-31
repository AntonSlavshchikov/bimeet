package middleware

import "net/http"

// SecurityHeaders sets a baseline of defensive HTTP response headers. The API
// only ever returns JSON, so a maximally restrictive CSP is safe. HSTS is only
// emitted in production (prod=true), since it would pin browsers to HTTPS and
// break plain-HTTP local development.
func SecurityHeaders(prod bool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := w.Header()
			h.Set("X-Content-Type-Options", "nosniff")
			h.Set("X-Frame-Options", "DENY")
			h.Set("Referrer-Policy", "no-referrer")
			h.Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
			if prod {
				h.Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
			}
			next.ServeHTTP(w, r)
		})
	}
}
