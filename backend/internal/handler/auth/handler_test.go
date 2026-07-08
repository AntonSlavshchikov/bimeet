package authhandler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	authhandler "bimeet/internal/handler/auth"
	"bimeet/internal/handler/auth/mock"
	"bimeet/internal/model"
	authsvc "bimeet/internal/service/auth"
)

func newRouter(t *testing.T) (http.Handler, *mock.MockAuthService) {
	t.Helper()
	ctrl := gomock.NewController(t)
	svc := mock.NewMockAuthService(ctrl)
	h := authhandler.New(svc)
	r := chi.NewRouter()
	r.Post("/auth/request-code", h.RequestCode)
	r.Post("/auth/verify-code", h.VerifyCode)
	return r, svc
}

func post(t *testing.T, router http.Handler, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	b, _ := json.Marshal(body)
	req := httptest.NewRequestWithContext(context.Background(), http.MethodPost, path, bytes.NewBuffer(b))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	return w
}

// ─── RequestCode ─────────────────────────────────────────────────────────────

func TestRequestCode_InvalidBody(t *testing.T) {
	router, _ := newRouter(t)
	req := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/auth/request-code", bytes.NewBufferString("bad"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestRequestCode_OK(t *testing.T) {
	router, svc := newRouter(t)
	svc.EXPECT().RequestCode(gomock.Any(), gomock.Any()).Return(nil)

	w := post(t, router, "/auth/request-code", model.RequestCodeRequest{Email: "a@b.com"})
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestRequestCode_Cooldown(t *testing.T) {
	router, svc := newRouter(t)
	svc.EXPECT().RequestCode(gomock.Any(), gomock.Any()).Return(authsvc.ErrCooldown)

	w := post(t, router, "/auth/request-code", model.RequestCodeRequest{Email: "a@b.com"})
	assert.Equal(t, http.StatusTooManyRequests, w.Code)
}

// ─── VerifyCode ──────────────────────────────────────────────────────────────

func TestVerifyCode_InvalidCode(t *testing.T) {
	router, svc := newRouter(t)
	svc.EXPECT().VerifyCode(gomock.Any(), gomock.Any()).Return(model.AuthResponse{}, authsvc.ErrInvalidCode)

	w := post(t, router, "/auth/verify-code", model.VerifyCodeRequest{Email: "a@b.com", Code: "000000"})
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestVerifyCode_HappyPath(t *testing.T) {
	router, svc := newRouter(t)
	userID := uuid.New()
	svc.EXPECT().VerifyCode(gomock.Any(), gomock.Any()).
		Return(model.AuthResponse{Token: "tok", User: model.User{ID: userID}}, nil)

	w := post(t, router, "/auth/verify-code", model.VerifyCodeRequest{Email: "a@b.com", Code: "123456"})
	assert.Equal(t, http.StatusOK, w.Code)

	var resp model.AuthResponse
	require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
	assert.Equal(t, "tok", resp.Token)
}
