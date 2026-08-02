package profilehandler_test

import (
	"bytes"
	"context"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	profilehandler "bimeet/internal/handler/profile"
	"bimeet/internal/middleware"
	"bimeet/internal/model"
)

type stubProfileService struct {
	uploadCalled bool
}

func (s *stubProfileService) GetMe(context.Context, uuid.UUID) (model.User, error) {
	return model.User{}, nil
}

func (s *stubProfileService) UpdateMe(context.Context, uuid.UUID, model.UpdateProfileRequest) (model.User, error) {
	return model.User{}, nil
}

func (s *stubProfileService) GetStats(context.Context, uuid.UUID) (model.ProfileStats, error) {
	return model.ProfileStats{}, nil
}

func (s *stubProfileService) UploadAvatar(context.Context, uuid.UUID, multipart.File, *multipart.FileHeader) (model.User, error) {
	s.uploadCalled = true
	return model.User{}, nil
}

func (s *stubProfileService) DeleteAvatar(context.Context, uuid.UUID) (model.User, error) {
	return model.User{}, nil
}

func avatarRequest(t *testing.T, size int) *http.Request {
	t.Helper()

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("avatar", "avatar.png")
	require.NoError(t, err)
	_, err = part.Write(make([]byte, size))
	require.NoError(t, err)
	require.NoError(t, writer.Close())

	req := httptest.NewRequest(http.MethodPost, "/api/auth/me/avatar", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	return req.WithContext(middleware.WithUserID(req.Context(), uuid.New()))
}

func TestUploadAvatar_RejectsFileOverFiveMB(t *testing.T) {
	svc := &stubProfileService{}
	handler := profilehandler.New(svc)
	recorder := httptest.NewRecorder()

	handler.UploadAvatar(recorder, avatarRequest(t, 5<<20+1))

	assert.Equal(t, http.StatusRequestEntityTooLarge, recorder.Code)
	assert.Contains(t, recorder.Body.String(), "avatar exceeds 5 MB limit")
	assert.False(t, svc.uploadCalled)
}

func TestUploadAvatar_AllowsFileAtFiveMB(t *testing.T) {
	svc := &stubProfileService{}
	handler := profilehandler.New(svc)
	recorder := httptest.NewRecorder()

	handler.UploadAvatar(recorder, avatarRequest(t, 5<<20))

	assert.Equal(t, http.StatusOK, recorder.Code)
	assert.True(t, svc.uploadCalled)
}
