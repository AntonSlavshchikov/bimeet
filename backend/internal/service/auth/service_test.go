package authsvc_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
	"golang.org/x/crypto/bcrypt"

	"bimeet/internal/model"
	authsvc "bimeet/internal/service/auth"
	"bimeet/internal/service/auth/mock"
)

func newService(t *testing.T) (*authsvc.Service, *mock.MockUserRepo) {
	t.Helper()
	ctrl := gomock.NewController(t)
	repo := mock.NewMockUserRepo(ctrl)
	return authsvc.New(repo, "secret", 72), repo
}

// ─── Register ──────────────────────────────────────────────────────────────

func TestRegister_MissingFields(t *testing.T) {
	svc, _ := newService(t)
	_, err := svc.Register(context.Background(), model.RegisterRequest{})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "required")
}

func TestRegister_HappyPath(t *testing.T) {
	svc, repo := newService(t)

	userID := uuid.New()
	repo.EXPECT().Create(gomock.Any(), "Alice", "alice@example.com", gomock.Any()).
		Return(model.User{ID: userID, Name: "Alice", Email: "alice@example.com"}, nil)

	resp, err := svc.Register(context.Background(), model.RegisterRequest{
		Name:     "Alice",
		Email:    "alice@example.com",
		Password: "pass123",
	})
	require.NoError(t, err)
	assert.Equal(t, userID, resp.User.ID)
	assert.NotEmpty(t, resp.Token)
}

func TestRegister_RepoError(t *testing.T) {
	svc, repo := newService(t)

	repo.EXPECT().Create(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return(model.User{}, errors.New("duplicate key"))

	_, err := svc.Register(context.Background(), model.RegisterRequest{
		Name:     "Alice",
		Email:    "alice@example.com",
		Password: "pass123",
	})
	require.Error(t, err)
}

// ─── Login ─────────────────────────────────────────────────────────────────

func TestLogin_MissingFields(t *testing.T) {
	svc, _ := newService(t)
	_, err := svc.Login(context.Background(), model.LoginRequest{})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "required")
}

func TestLogin_UserNotFound(t *testing.T) {
	svc, repo := newService(t)

	repo.EXPECT().GetByEmail(gomock.Any(), "ghost@x.com").Return(model.User{}, errors.New("not found"))

	_, err := svc.Login(context.Background(), model.LoginRequest{Email: "ghost@x.com", Password: "pass"})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid credentials")
}

func TestLogin_WrongPassword(t *testing.T) {
	svc, repo := newService(t)

	hash, _ := bcrypt.GenerateFromPassword([]byte("correct"), bcrypt.MinCost)
	repo.EXPECT().GetByEmail(gomock.Any(), "u@x.com").
		Return(model.User{Email: "u@x.com", PasswordHash: string(hash)}, nil)

	_, err := svc.Login(context.Background(), model.LoginRequest{Email: "u@x.com", Password: "wrong"})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid credentials")
}

func TestLogin_HappyPath(t *testing.T) {
	svc, repo := newService(t)

	hash, _ := bcrypt.GenerateFromPassword([]byte("pass123"), bcrypt.MinCost)
	userID := uuid.New()
	repo.EXPECT().GetByEmail(gomock.Any(), "alice@example.com").
		Return(model.User{ID: userID, Email: "alice@example.com", PasswordHash: string(hash)}, nil)

	resp, err := svc.Login(context.Background(), model.LoginRequest{Email: "alice@example.com", Password: "pass123"})
	require.NoError(t, err)
	assert.Equal(t, userID, resp.User.ID)
	assert.NotEmpty(t, resp.Token)
}
