package pushhandler_test

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"bimeet/internal/handler/push"
	"bimeet/internal/handler/push/mock"
	"bimeet/internal/middleware"
)

func TestUnsubscribePassesCallerIDToService(t *testing.T) {
	ctrl := gomock.NewController(t)
	svc := mock.NewMockPushService(ctrl)
	h := pushhandler.New(svc)

	router := chi.NewRouter()
	router.Post("/push/unsubscribe", h.Unsubscribe)

	userID := uuid.New()
	endpoint := "https://push.example/sub/1"
	svc.EXPECT().Unsubscribe(gomock.Any(), userID, endpoint).Return(nil)

	req := httptest.NewRequest(http.MethodPost, "/push/unsubscribe", bytes.NewBufferString(`{"endpoint":"`+endpoint+`"}`))
	req = req.WithContext(middleware.WithUserID(req.Context(), userID))
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNoContent, w.Code)
}
