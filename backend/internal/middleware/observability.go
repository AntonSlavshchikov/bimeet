package middleware

import (
	"context"
	"log/slog"
	"net/http"

	chimw "github.com/go-chi/chi/v5/middleware"
	"go.opentelemetry.io/otel/trace"

	"bimeet/internal/observability"
)

// reqState carries request-scoped fields filled in by middleware deeper in the
// stack (e.g. user_id set by Auth) and read back by the request-summary logger.
// A pointer is stored in the context before Auth runs, so downstream mutations
// are visible to the summary logger through the shared pointer — context values
// only propagate downward, but the pointee is shared.
type reqState struct {
	userID string
}

type reqStateKey struct{}

func reqStateFrom(ctx context.Context) *reqState {
	rs, _ := ctx.Value(reqStateKey{}).(*reqState)
	return rs
}

// Observability builds a request-scoped slog logger enriched with the trace
// correlation fields (request_id from chi, trace_id/span_id from the span
// started by the upstream otelchi middleware) and stores it — together with a
// mutable reqState — in the context for handlers, services and the
// request-summary logger.
func Observability(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := slog.Default()

		if reqID := chimw.GetReqID(ctx); reqID != "" {
			l = l.With("request_id", reqID)
		}
		if sc := trace.SpanContextFromContext(ctx); sc.HasTraceID() {
			l = l.With("trace_id", sc.TraceID().String(), "span_id", sc.SpanID().String())
		}

		ctx = observability.WithLogger(ctx, l)
		ctx = context.WithValue(ctx, reqStateKey{}, &reqState{})
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
