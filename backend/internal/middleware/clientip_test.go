package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestClientIP(t *testing.T) {
	cases := []struct {
		name    string
		remote  string
		headers map[string]string
		want    string
	}{
		{"via traefik and nginx", "172.18.0.5:4000", map[string]string{"X-Forwarded-For": "203.0.113.7, 172.18.0.2"}, "203.0.113.7"},
		{"spoofed True-Client-IP ignored", "172.18.0.5:4000", map[string]string{"X-Forwarded-For": "203.0.113.7, 172.18.0.2", "True-Client-IP": "10.99.99.99"}, "203.0.113.7"},
		{"spoofed X-Real-IP ignored", "172.18.0.5:4000", map[string]string{"X-Forwarded-For": "203.0.113.7, 172.18.0.2", "X-Real-IP": "198.51.100.1"}, "203.0.113.7"},
		{"client-prepended XFF never reached", "172.18.0.5:4000", map[string]string{"X-Forwarded-For": "198.51.100.1, 203.0.113.7, 172.18.0.2"}, "203.0.113.7"},
		{"direct public peer keeps its address", "203.0.113.9:5000", map[string]string{"X-Forwarded-For": "198.51.100.1", "True-Client-IP": "10.1.1.1"}, "203.0.113.9:5000"},
		{"malformed chain keeps proxy address", "172.18.0.5:4000", map[string]string{"X-Forwarded-For": "garbage, 172.18.0.2"}, "172.18.0.5:4000"},
		{"no XFF keeps proxy address", "172.18.0.5:4000", nil, "172.18.0.5:4000"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var got string
			h := ClientIP(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) { got = r.RemoteAddr }))
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			req.RemoteAddr = tc.remote
			for k, v := range tc.headers {
				req.Header.Set(k, v)
			}
			h.ServeHTTP(httptest.NewRecorder(), req)
			assert.Equal(t, tc.want, got)
		})
	}
}

// Spoofed True-Client-IP must not give a fresh rate-limit bucket on /api/auth.
func TestClientIP_AuthLimitNotBypassed(t *testing.T) {
	h := ClientIP(RateLimitAuth()(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {})))
	limited := 0
	for i := range 15 {
		req := httptest.NewRequest(http.MethodPost, "/api/auth/verify-code", nil)
		req.RemoteAddr = "172.18.0.5:4000"
		req.Header.Set("X-Forwarded-For", "203.0.113.7, 172.18.0.2")
		req.Header.Set("True-Client-IP", "10.0.0."+string(rune('0'+i%10)))
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code == http.StatusTooManyRequests {
			limited++
		}
	}
	assert.Equal(t, 5, limited, "requests 11-15 from the same client must be limited")
}
