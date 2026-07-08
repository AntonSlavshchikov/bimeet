package middleware

import (
	"errors"
	"fmt"
	"net/http"
	"runtime/debug"

	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"

	"bimeet/internal/handler/response"
	"bimeet/internal/observability"
)

// Recoverer catches panics from downstream handlers, logs them as a structured
// error with the stack trace and the request's trace_id, marks the active span
// as failed, and returns a 500 JSON response instead of dropping the connection.
func Recoverer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			rec := recover()
			if rec == nil {
				return
			}
			// http.ErrAbortHandler is an intentional abort — let it propagate so
			// the server handles it without logging it as a crash.
			if err, ok := rec.(error); ok && errors.Is(err, http.ErrAbortHandler) {
				panic(rec)
			}

			ctx := r.Context()
			err := fmt.Errorf("panic: %v", rec)

			observability.FromContext(ctx).Error("panic recovered",
				"error", err.Error(),
				"method", r.Method,
				"route", r.URL.Path,
				"stack", string(debug.Stack()),
			)

			if span := trace.SpanFromContext(ctx); span.IsRecording() {
				span.RecordError(err)
				span.SetStatus(codes.Error, "panic")
			}

			response.Error(w, http.StatusInternalServerError, "internal server error")
		}()

		next.ServeHTTP(w, r)
	})
}
