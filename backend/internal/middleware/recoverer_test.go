package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/stretchr/testify/assert"

	"bimeet/internal/middleware"
)

// Guards the assumption baked into the router stack: a panic in a handler is
// recovered into a 500 instead of crashing the connection. Logging wraps the
// handler the same way it does in NewRouter.
func TestRecoverer_PanicBecomes500(t *testing.T) {
	panicking := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic("boom")
	})

	handler := middleware.Logging(chimw.Recoverer(panicking))

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)

	assert.NotPanics(t, func() { handler.ServeHTTP(rec, req) })
	assert.Equal(t, http.StatusInternalServerError, rec.Code)
}
