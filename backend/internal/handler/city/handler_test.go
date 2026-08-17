package cityhandler_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	cityhandler "bimeet/internal/handler/city"
	"bimeet/internal/handler/city/mock"
	"bimeet/internal/middleware"
	"bimeet/internal/model"
)

func TestList_RequiresAuth(t *testing.T) {
	ctrl := gomock.NewController(t)
	h := cityhandler.New(mock.NewMockCityService(ctrl))
	r := chi.NewRouter()
	r.Get("/cities", h.List)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/cities", nil))
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestList_ReturnsEmptyArray(t *testing.T) {
	ctrl := gomock.NewController(t)
	svc := mock.NewMockCityService(ctrl)
	h := cityhandler.New(svc)
	r := chi.NewRouter()
	r.Get("/cities", h.List)
	svc.EXPECT().List(gomock.Any()).Return(nil, nil)

	req := httptest.NewRequest(http.MethodGet, "/cities", nil)
	req = req.WithContext(middleware.WithUserID(req.Context(), uuid.New()))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var got []model.City
	require.NoError(t, json.NewDecoder(w.Body).Decode(&got))
	require.NotNil(t, got)
	require.Empty(t, got)
}
