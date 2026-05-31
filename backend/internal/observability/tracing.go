package observability

import (
	"context"
	"fmt"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.39.0"
)

// TracingConfig configures the OpenTelemetry trace provider.
type TracingConfig struct {
	Enabled     bool
	ServiceName string
	Environment string // deployment.environment, e.g. APP_ENV
	Endpoint    string // OTLP/HTTP endpoint host:port (e.g. "localhost:4318"); empty → SDK default
}

// noopShutdown is returned when tracing is disabled.
func noopShutdown(context.Context) error { return nil }

// InitTracing sets up the global TracerProvider with an OTLP/HTTP exporter and
// the W3C TraceContext + Baggage propagators. When cfg.Enabled is false it
// installs only the propagators and leaves the global provider as the no-op,
// so otel.Tracer(...) / Span(...) stay cheap (zero overhead) in local dev.
//
// The returned shutdown flushes and stops the exporter; it is always safe to
// call, including when tracing is disabled.
func InitTracing(ctx context.Context, cfg TracingConfig) (func(context.Context) error, error) {
	// Propagators are always installed so trace context flows over W3C headers,
	// regardless of whether we export spans ourselves.
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	if !cfg.Enabled {
		return noopShutdown, nil
	}

	opts := []otlptracehttp.Option{}
	if cfg.Endpoint != "" {
		// Endpoint is a host:port without scheme; bimeet talks to a local/in-cluster
		// collector over plaintext, so disable TLS.
		opts = append(opts, otlptracehttp.WithEndpoint(cfg.Endpoint), otlptracehttp.WithInsecure())
	}

	exp, err := otlptracehttp.New(ctx, opts...)
	if err != nil {
		return nil, fmt.Errorf("otlp trace exporter: %w", err)
	}

	res, err := resource.Merge(resource.Default(), resource.NewWithAttributes(
		semconv.SchemaURL,
		semconv.ServiceName(cfg.ServiceName),
		semconv.DeploymentEnvironmentName(cfg.Environment),
	))
	if err != nil {
		return nil, fmt.Errorf("otel resource: %w", err)
	}

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exp),
		sdktrace.WithResource(res),
	)
	otel.SetTracerProvider(tp)

	return tp.Shutdown, nil
}
