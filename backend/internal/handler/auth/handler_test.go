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
	"bimeet/internal/middleware"
	"bimeet/internal/model"
	authsvc "bimeet/internal/service/auth"
)

func newRouter(t *testing.T) (http.Handler, *mock.MockAuthService) {
	t.Helper()
	ctrl := gomock.NewController(t)
	svc := mock.NewMockAuthService(ctrl)
	h := authhandler.New(svc, false)
	r := chi.NewRouter()
	userID := uuid.New()
	sessionID := uuid.New()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			ctx := middleware.WithUserID(req.Context(), userID)
			ctx = middleware.WithSessionID(ctx, sessionID)
			next.ServeHTTP(w, req.WithContext(ctx))
		})
	})
	r.Post("/auth/request-code", h.RequestCode)
	r.Post("/auth/verify-code", h.VerifyCode)
	r.Post("/auth/refresh", h.Refresh)
	r.Post("/auth/logout", h.Logout)
	r.Get("/auth/me/sessions", h.ListSessions)
	r.Delete("/auth/me/sessions/others", h.RevokeOtherSessions)
	r.Delete("/auth/me/sessions/{id}", h.RevokeSession)
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
	svc.EXPECT().VerifyCode(gomock.Any(), gomock.Any(), gomock.Any()).Return(model.AuthResponse{}, authsvc.ErrInvalidCode)

	w := post(t, router, "/auth/verify-code", model.VerifyCodeRequest{Email: "a@b.com", Code: "000000"})
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestVerifyCode_HappyPath(t *testing.T) {
	router, svc := newRouter(t)
	userID := uuid.New()
	svc.EXPECT().VerifyCode(gomock.Any(), gomock.Any(), gomock.Any()).
		Return(model.AuthResponse{Token: "tok", RefreshToken: "refresh", User: model.User{ID: userID}}, nil)

	w := post(t, router, "/auth/verify-code", model.VerifyCodeRequest{Email: "a@b.com", Code: "123456"})
	assert.Equal(t, http.StatusOK, w.Code)

	var resp model.AuthResponse
	require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
	assert.Equal(t, "tok", resp.Token)
	assert.Empty(t, resp.RefreshToken)
	require.Len(t, w.Result().Cookies(), 1)
	assert.Equal(t, "bimeet_refresh", w.Result().Cookies()[0].Name)
	assert.True(t, w.Result().Cookies()[0].HttpOnly)
}

func TestRefresh_HappyPathRotatesCookie(t *testing.T) {
	router, svc := newRouter(t)
	svc.EXPECT().Refresh(gomock.Any(), "old-refresh", gomock.Any()).
		Return(model.RefreshResponse{Token: "new-access", RefreshToken: "new-refresh"}, nil)
	req := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/auth/refresh", nil)
	req.AddCookie(&http.Cookie{Name: "bimeet_refresh", Value: "old-refresh"})
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp model.RefreshResponse
	require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
	assert.Equal(t, "new-access", resp.Token)
	require.Len(t, w.Result().Cookies(), 1)
	assert.Equal(t, "new-refresh", w.Result().Cookies()[0].Value)
}

func TestRefresh_RejectsMissingCookie(t *testing.T) {
	router, _ := newRouter(t)
	w := post(t, router, "/auth/refresh", nil)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestLogout_RevokesAndClearsCookie(t *testing.T) {
	router, svc := newRouter(t)
	svc.EXPECT().RevokeRefreshToken(gomock.Any(), "refresh").Return(nil)
	req := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/auth/logout", nil)
	req.AddCookie(&http.Cookie{Name: "bimeet_refresh", Value: "refresh"})
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNoContent, w.Code)
	require.Len(t, w.Result().Cookies(), 1)
	assert.Equal(t, -1, w.Result().Cookies()[0].MaxAge)
}

func TestListSessions(t *testing.T) {
	router, svc := newRouter(t)
	svc.EXPECT().ListSessions(gomock.Any(), gomock.Any(), gomock.Any()).
		Return([]model.AuthSession{{ID: uuid.New(), Current: true}}, nil)
	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/auth/me/sessions", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var sessions []model.AuthSession
	require.NoError(t, json.NewDecoder(w.Body).Decode(&sessions))
	require.Len(t, sessions, 1)
	assert.True(t, sessions[0].Current)
}

func TestRevokeSession_CurrentClearsCookie(t *testing.T) {
	ctrl := gomock.NewController(t)
	svc := mock.NewMockAuthService(ctrl)
	h := authhandler.New(svc, false)
	userID := uuid.New()
	sessionID := uuid.New()
	svc.EXPECT().RevokeSession(gomock.Any(), userID, sessionID).Return(nil)
	r := chi.NewRouter()
	r.Delete("/auth/me/sessions/{id}", func(w http.ResponseWriter, req *http.Request) {
		ctx := middleware.WithUserID(req.Context(), userID)
		ctx = middleware.WithSessionID(ctx, sessionID)
		h.RevokeSession(w, req.WithContext(ctx))
	})
	req := httptest.NewRequestWithContext(context.Background(), http.MethodDelete, "/auth/me/sessions/"+sessionID.String(), nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNoContent, w.Code)
	require.Len(t, w.Result().Cookies(), 1)
	assert.Equal(t, -1, w.Result().Cookies()[0].MaxAge)
}

func TestRevokeOtherSessions(t *testing.T) {
	router, svc := newRouter(t)
	svc.EXPECT().RevokeOtherSessions(gomock.Any(), gomock.Any(), gomock.Any()).Return(nil)
	req := httptest.NewRequestWithContext(context.Background(), http.MethodDelete, "/auth/me/sessions/others", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNoContent, w.Code)
}
