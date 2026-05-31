package response_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"bimeet/internal/handler/response"
)

type payload struct {
	Note string `json:"note"`
}

func TestParseJSON_DecodesSmallBody(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"note":"hi"}`))

	var p payload
	require.NoError(t, response.ParseJSON(req, &p))
	assert.Equal(t, "hi", p.Note)
}

func TestParseJSON_RejectsOversizedBody(t *testing.T) {
	// > 1 MiB body must be rejected by the MaxBytesReader cap.
	big := `{"note":"` + strings.Repeat("a", (1<<20)+100) + `"}`
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(big))

	var p payload
	err := response.ParseJSON(req, &p)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "too large")
}
