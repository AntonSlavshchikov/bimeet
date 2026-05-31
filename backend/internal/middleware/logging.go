package middleware

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"bimeet/internal/observability"
)

type responseWriter struct {
	http.ResponseWriter
	status int
	bytes  int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.status = code
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	n, err := rw.ResponseWriter.Write(b)
	rw.bytes += n
	return n, err
}

// Logging emits one structured line per request once it completes, using the
// request-scoped logger (so the line carries trace_id/request_id) plus status,
// duration, response size, the matched chi route and — if authenticated —
// user_id. Log level scales with status: 5xx→error, 4xx→warn, else info.
func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		wrapped := &responseWriter{ResponseWriter: w, status: http.StatusOK}

		next.ServeHTTP(wrapped, r)

		// Prefer the low-cardinality chi route pattern (e.g. /api/events/{id})
		// over the concrete path; it is populated by the time routing completes.
		route := r.URL.Path
		if rc := chi.RouteContext(r.Context()); rc != nil && rc.RoutePattern() != "" {
			route = rc.RoutePattern()
		}

		attrs := []any{
			"method", r.Method,
			"route", route,
			"status", wrapped.status,
			"dur_ms", time.Since(start).Milliseconds(),
			"bytes", wrapped.bytes,
			"remote_ip", r.RemoteAddr,
		}
		if rs := reqStateFrom(r.Context()); rs != nil && rs.userID != "" {
			attrs = append(attrs, "user_id", rs.userID)
		}

		observability.FromContext(r.Context()).Log(r.Context(), levelForStatus(wrapped.status), "http_request", attrs...)
	})
}

func levelForStatus(status int) slog.Level {
	switch {
	case status >= 500:
		return slog.LevelError
	case status >= 400:
		return slog.LevelWarn
	default:
		return slog.LevelInfo
	}
}
