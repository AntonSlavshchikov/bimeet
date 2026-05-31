// Package observability wires structured logging (log/slog) and distributed
// tracing (OpenTelemetry) together for the bimeet backend. A single request
// carries one trace_id that links every log line to the trace waterfall in
// Jaeger.
package observability

import (
	"context"
	"log/slog"
	"os"
	"strings"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/trace"
)

// tracerName identifies spans created via Span in the trace backend.
const tracerName = "bimeet"

type ctxKey int

const loggerKey ctxKey = iota

// InitLogger installs the global slog logger. format is "json" or "text"
// (anything non-json falls back to text); level is debug/info/warn/error.
func InitLogger(format, level string) {
	opts := &slog.HandlerOptions{Level: parseLevel(level)}
	var h slog.Handler
	if strings.EqualFold(strings.TrimSpace(format), "json") {
		h = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		h = slog.NewTextHandler(os.Stdout, opts)
	}
	slog.SetDefault(slog.New(h))
}

func parseLevel(s string) slog.Level {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

// WithLogger stores a request-scoped logger in the context.
func WithLogger(ctx context.Context, l *slog.Logger) context.Context {
	return context.WithValue(ctx, loggerKey, l)
}

// FromContext returns the request-scoped logger. When none was injected it
// falls back to the default logger, enriched with the active span's trace_id
// if one is present — so logs stay correlated even outside the HTTP path.
func FromContext(ctx context.Context) *slog.Logger {
	if l, ok := ctx.Value(loggerKey).(*slog.Logger); ok && l != nil {
		return l
	}
	l := slog.Default()
	if sc := trace.SpanContextFromContext(ctx); sc.HasTraceID() {
		l = l.With("trace_id", sc.TraceID().String())
	}
	return l
}

// Span starts a child span named name. When tracing is disabled the global
// provider is a no-op, so this is cheap and always safe to call. The caller
// must End() the returned span (typically `defer span.End()`).
func Span(ctx context.Context, name string) (context.Context, trace.Span) {
	return otel.Tracer(tracerName).Start(ctx, name)
}
