package observability_test

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"bimeet/internal/observability"
)

func TestFromContext_FallsBackToDefault(t *testing.T) {
	// No logger injected → returns a usable logger (the default), never nil.
	l := observability.FromContext(context.Background())
	require.NotNil(t, l)
}

func TestFromContext_ReturnsInjectedLogger(t *testing.T) {
	var buf bytes.Buffer
	want := slog.New(slog.NewJSONHandler(&buf, nil)).With("marker", "abc123")

	ctx := observability.WithLogger(context.Background(), want)
	observability.FromContext(ctx).Info("hello")

	assert.Contains(t, buf.String(), `"marker":"abc123"`)
	assert.Contains(t, buf.String(), `"msg":"hello"`)
}

func TestInitLogger_JSONFormatAndLevel(t *testing.T) {
	// InitLogger swaps the global default; capture it via slog after init.
	// We can't redirect os.Stdout cleanly here, so just assert it doesn't panic
	// and that the resulting default logger honors the configured level.
	observability.InitLogger("json", "warn")
	assert.False(t, slog.Default().Enabled(context.Background(), slog.LevelInfo))
	assert.True(t, slog.Default().Enabled(context.Background(), slog.LevelWarn))

	// Restore a permissive default for other tests in the package.
	observability.InitLogger("text", "debug")
	assert.True(t, slog.Default().Enabled(context.Background(), slog.LevelDebug))
}

func TestSpan_NoopWhenTracingDisabled(t *testing.T) {
	// With no TracerProvider configured the global is a no-op: Span must still
	// return a valid context and a span that is safe to End.
	ctx, span := observability.Span(context.Background(), "unit.test")
	require.NotNil(t, ctx)
	require.NotNil(t, span)
	assert.False(t, span.SpanContext().IsValid()) // no-op span has no trace id
	span.End()
}

// ensure JSON logs are actually parseable (guards against malformed handler use)
func TestInjectedLogger_EmitsValidJSON(t *testing.T) {
	var buf bytes.Buffer
	l := slog.New(slog.NewJSONHandler(&buf, nil))
	ctx := observability.WithLogger(context.Background(), l)

	observability.FromContext(ctx).Error("boom", "error", "bad")

	line := strings.TrimSpace(buf.String())
	var parsed map[string]any
	require.NoError(t, json.Unmarshal([]byte(line), &parsed))
	assert.Equal(t, "boom", parsed["msg"])
	assert.Equal(t, "bad", parsed["error"])
}
