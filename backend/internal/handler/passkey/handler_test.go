package passkeyhandler_test

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

	passkeyhandler "bimeet/internal/handler/passkey"
	"bimeet/internal/handler/passkey/mock"
	"bimeet/internal/middleware"
	"bimeet/internal/model"
	passkeysvc "bimeet/internal/service/passkey"
)

func passkeyRouter(t *testing.T) (http.Handler, *mock.MockPasskeyService, uuid.UUID) {
	t.Helper()
	ctrl := gomock.NewController(t)
	svc := mock.NewMockPasskeyService(ctrl)
	h := passkeyhandler.New(svc, true)
	userID := uuid.New()
	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			next.ServeHTTP(w, req.WithContext(middleware.WithUserID(req.Context(), userID)))
		})
	})
	r.Get("/config", h.Config)
	r.Post("/login/verify", h.FinishLogin)
	r.Post("/registration/verify", h.FinishRegistration)
	r.Delete("/passkeys/{id}", h.Delete)
	return r, svc, userID
}

func passkeyPost(t *testing.T, router http.Handler, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	encoded, err := json.Marshal(body)
	require.NoError(t, err)
	req := httptest.NewRequestWithContext(context.Background(), http.MethodPost, path, bytes.NewReader(encoded))
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, req)
	return recorder
}

func TestFinishLoginUsesGenericStatusCodes(t *testing.T) {
	for _, tt := range []struct {
		name string
		err  error
		want int
	}{
		{"unknown credential", passkeysvc.ErrVerification, http.StatusUnauthorized},
		{"expired or consumed ceremony", passkeysvc.ErrInvalidCeremony, http.StatusBadRequest},
	} {
		t.Run(tt.name, func(t *testing.T) {
			router, svc, _ := passkeyRouter(t)
			svc.EXPECT().FinishLogin(gomock.Any(), gomock.Any(), gomock.Any()).Return(model.AuthResponse{}, tt.err)
			response := passkeyPost(t, router, "/login/verify", model.PasskeyVerifyRequest{
				CeremonyID: uuid.New(), Credential: json.RawMessage(`{"id":"not-logged"}`),
			})
			assert.Equal(t, tt.want, response.Code)
			assert.NotContains(t, response.Body.String(), "not-logged")
		})
	}
}

func TestFinishLoginSetsExistingRefreshCookie(t *testing.T) {
	router, svc, _ := passkeyRouter(t)
	svc.EXPECT().FinishLogin(gomock.Any(), gomock.Any(), "Chrome").Return(model.AuthResponse{
		Token: "access", RefreshToken: "refresh", User: model.User{ID: uuid.New()}, HasPasskeys: true,
	}, nil)
	encoded, _ := json.Marshal(model.PasskeyVerifyRequest{CeremonyID: uuid.New(), Credential: json.RawMessage(`{}`)})
	req := httptest.NewRequest(http.MethodPost, "/login/verify", bytes.NewReader(encoded))
	req.Header.Set("User-Agent", "Chrome")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, req)

	assert.Equal(t, http.StatusOK, recorder.Code)
	require.Len(t, recorder.Result().Cookies(), 1)
	cookie := recorder.Result().Cookies()[0]
	assert.Equal(t, "bimeet_refresh", cookie.Name)
	assert.True(t, cookie.HttpOnly)
	assert.True(t, cookie.Secure)
	assert.Equal(t, http.SameSiteStrictMode, cookie.SameSite)
	assert.Equal(t, "/api/auth", cookie.Path)
	assert.NotContains(t, recorder.Body.String(), "refresh")
}

func TestRegistrationDuplicateIsConflict(t *testing.T) {
	router, svc, userID := passkeyRouter(t)
	svc.EXPECT().FinishRegistration(gomock.Any(), userID, gomock.Any()).Return(model.Passkey{}, passkeysvc.ErrDuplicate)
	response := passkeyPost(t, router, "/registration/verify", model.PasskeyVerifyRequest{
		CeremonyID: uuid.New(), Credential: json.RawMessage(`{}`),
	})
	assert.Equal(t, http.StatusConflict, response.Code)
}

func TestDeletePasskeyIsScopedToAuthenticatedUser(t *testing.T) {
	router, svc, userID := passkeyRouter(t)
	id := uuid.New()
	svc.EXPECT().Delete(gomock.Any(), userID, id).Return(passkeysvc.ErrNotFound)
	req := httptest.NewRequest(http.MethodDelete, "/passkeys/"+id.String(), nil)
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, req)
	assert.Equal(t, http.StatusNotFound, recorder.Code)
}
