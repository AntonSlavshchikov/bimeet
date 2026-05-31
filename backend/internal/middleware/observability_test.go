package middleware_test

import (
	"bytes"
	"context"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/riandyrn/otelchi"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"

	"bimeet/internal/middleware"
	"bimeet/internal/observability"
)

// withDefaultLogger swaps slog.Default to write into buf for the duration of
// the test, restoring the original afterwards.
func withDefaultLogger(t *testing.T) *bytes.Buffer {
	t.Helper()
	prev := slog.Default()
	buf := &bytes.Buffer{}
	slog.SetDefault(slog.New(slog.NewJSONHandler(buf, &slog.HandlerOptions{Level: slog.LevelDebug})))
	t.Cleanup(func() { slog.SetDefault(prev) })
	return buf
}

func TestRecoverer_PanicReturns500AndLogs(t *testing.T) {
	buf := withDefaultLogger(t)

	panicker := http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic("kaboom")
	})

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/boom", nil)
	middleware.Recoverer(panicker).ServeHTTP(rec, req)

	assert.Equal(t, http.StatusInternalServerError, rec.Code)
	assert.Contains(t, rec.Body.String(), "internal server error")

	logged := buf.String()
	assert.Contains(t, logged, "panic recovered")
	assert.Contains(t, logged, "kaboom")
	assert.Contains(t, logged, `"stack"`)
}

func TestObservability_InjectsRequestIDIntoLogger(t *testing.T) {
	buf := withDefaultLogger(t)

	var loggedFromHandler bool
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		observability.FromContext(r.Context()).Info("inside handler")
		loggedFromHandler = true
		w.WriteHeader(http.StatusOK)
	})

	// RequestID populates the chi request id that Observability lifts into the logger.
	stack := chimw.RequestID(middleware.Observability(handler))

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	stack.ServeHTTP(rec, req)

	require.True(t, loggedFromHandler)
	assert.Contains(t, buf.String(), `"request_id"`)
	assert.Contains(t, buf.String(), `"msg":"inside handler"`)
}

func TestLogging_EmitsStructuredRequestLine(t *testing.T) {
	buf := withDefaultLogger(t)

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTeapot)
		_, _ = w.Write([]byte("hi"))
	})

	// Observability injects the request-scoped logger that Logging reuses.
	stack := middleware.Observability(middleware.Logging(handler))

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/thing", nil)
	stack.ServeHTTP(rec, req)

	out := buf.String()
	assert.Contains(t, out, `"msg":"http_request"`)
	assert.Contains(t, out, `"status":418`)
	assert.Contains(t, out, `"bytes":2`)
	assert.Contains(t, out, `"route":"/api/thing"`)
}

func TestOtelchi_WritesTraceIDResponseHeader(t *testing.T) {
	// A real (sampled) provider so the span carries a valid trace id; passed
	// explicitly so we don't touch the global provider.
	tp := sdktrace.NewTracerProvider()
	t.Cleanup(func() { _ = tp.Shutdown(context.Background()) })

	r := chi.NewRouter()
	r.Use(otelchi.Middleware("bimeet-test",
		otelchi.WithTracerProvider(tp),
		otelchi.WithTraceResponseHeaders(otelchi.TraceHeaderConfig{}),
	))
	r.Get("/x", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	r.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.NotEmpty(t, rec.Header().Get("X-Trace-Id"), "X-Trace-Id response header must be set")
}
