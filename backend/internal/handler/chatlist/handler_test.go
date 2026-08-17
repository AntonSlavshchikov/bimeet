package chatlisthandler_test

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

	chatlisthandler "bimeet/internal/handler/chatlist"
	"bimeet/internal/handler/chatlist/mock"
	"bimeet/internal/middleware"
	"bimeet/internal/model"
)

func newRouter(t *testing.T) (http.Handler, *mock.MockChatListService) {
	t.Helper()
	ctrl := gomock.NewController(t)
	svc := mock.NewMockChatListService(ctrl)
	h := chatlisthandler.New(svc)
	r := chi.NewRouter()
	r.Get("/chats", h.List)
	return r, svc
}

func withAuth(r *http.Request, userID uuid.UUID) *http.Request {
	return r.WithContext(middleware.WithUserID(r.Context(), userID))
}

func TestList_NoAuth(t *testing.T) {
	router, _ := newRouter(t)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/chats", nil))
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestList_ServiceError(t *testing.T) {
	router, svc := newRouter(t)
	userID := uuid.New()
	svc.EXPECT().List(gomock.Any(), userID).Return(nil, assert.AnError)

	req := withAuth(httptest.NewRequest(http.MethodGet, "/chats", nil), userID)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestList_ReturnsEmptySlice(t *testing.T) {
	router, svc := newRouter(t)
	userID := uuid.New()
	svc.EXPECT().List(gomock.Any(), userID).Return([]model.ChatSummary{}, nil)

	req := withAuth(httptest.NewRequest(http.MethodGet, "/chats", nil), userID)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
	var body []interface{}
	require.NoError(t, json.NewDecoder(w.Body).Decode(&body))
	assert.NotNil(t, body)
}

func TestList_HappyPath(t *testing.T) {
	router, svc := newRouter(t)
	userID := uuid.New()
	expected := []model.ChatSummary{{EventID: uuid.New(), EventTitle: "Standing chat"}}
	svc.EXPECT().List(gomock.Any(), userID).Return(expected, nil)

	req := withAuth(httptest.NewRequest(http.MethodGet, "/chats", nil), userID)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var body []model.ChatSummary
	require.NoError(t, json.NewDecoder(w.Body).Decode(&body))
	assert.Len(t, body, 1)
	assert.Equal(t, expected[0].EventTitle, body[0].EventTitle)
}
