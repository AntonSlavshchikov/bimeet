package authsvc_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
	"golang.org/x/crypto/bcrypt"

	"bimeet/internal/model"
	authsvc "bimeet/internal/service/auth"
	"bimeet/internal/service/auth/mock"
)

func newService(t *testing.T, authTest bool) (*authsvc.Service, *mock.MockUserRepo, *mock.MockLoginCodeRepo, *mock.MockMailer) {
	t.Helper()
	ctrl := gomock.NewController(t)
	users := mock.NewMockUserRepo(ctrl)
	codes := mock.NewMockLoginCodeRepo(ctrl)
	mailer := mock.NewMockMailer(ctrl)
	return authsvc.New(users, codes, mailer, "secret", 72, 720, authTest), users, codes, mailer
}

// ─── RequestCode ─────────────────────────────────────────────────────────────

func TestRequestCode_MissingEmail(t *testing.T) {
	svc, _, _, _ := newService(t, false)
	err := svc.RequestCode(context.Background(), model.RequestCodeRequest{})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "required")
}

func TestRequestCode_InvalidEmail(t *testing.T) {
	svc, _, _, _ := newService(t, false)
	err := svc.RequestCode(context.Background(), model.RequestCodeRequest{Email: "not-an-email"})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "email")
}

func TestRequestCode_Cooldown(t *testing.T) {
	svc, _, codes, _ := newService(t, false)
	codes.EXPECT().GetActiveByEmail(gomock.Any(), "alice@example.com").
		Return(model.LoginCode{CreatedAt: time.Now().Add(-10 * time.Second)}, nil)

	err := svc.RequestCode(context.Background(), model.RequestCodeRequest{Email: "alice@example.com"})
	require.ErrorIs(t, err, authsvc.ErrCooldown)
}

func TestRequestCode_HappyPath_SendsEmail(t *testing.T) {
	svc, _, codes, mailer := newService(t, false)

	codes.EXPECT().GetActiveByEmail(gomock.Any(), "alice@example.com").
		Return(model.LoginCode{}, errors.New("not found"))
	codes.EXPECT().InvalidateByEmail(gomock.Any(), "alice@example.com").Return(nil)
	codes.EXPECT().Create(gomock.Any(), "alice@example.com", gomock.Any(), gomock.Any()).
		Return(model.LoginCode{ID: uuid.New()}, nil)

	done := make(chan struct{})
	mailer.EXPECT().SendLoginCode("alice@example.com", gomock.Any()).
		DoAndReturn(func(_, code string) error {
			assert.Len(t, code, 6)
			close(done)
			return nil
		})

	err := svc.RequestCode(context.Background(), model.RequestCodeRequest{Email: "Alice@Example.com"})
	require.NoError(t, err)

	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("SendLoginCode was not called")
	}
}

func TestRequestCode_TestMode_NoEmail(t *testing.T) {
	svc, _, codes, _ := newService(t, true) // authTest = true → no mailer call expected

	codes.EXPECT().GetActiveByEmail(gomock.Any(), "alice@example.com").
		Return(model.LoginCode{}, errors.New("not found"))
	codes.EXPECT().InvalidateByEmail(gomock.Any(), "alice@example.com").Return(nil)
	// The stored hash must match the fixed test code "120401".
	codes.EXPECT().Create(gomock.Any(), "alice@example.com", gomock.Any(), gomock.Any()).
		DoAndReturn(func(_ context.Context, _, hash string, _ time.Time) (model.LoginCode, error) {
			require.NoError(t, bcrypt.CompareHashAndPassword([]byte(hash), []byte("120401")))
			return model.LoginCode{ID: uuid.New()}, nil
		})

	err := svc.RequestCode(context.Background(), model.RequestCodeRequest{Email: "alice@example.com"})
	require.NoError(t, err)
}

// ─── VerifyCode ──────────────────────────────────────────────────────────────

func TestVerifyCode_MissingFields(t *testing.T) {
	svc, _, _, _ := newService(t, false)
	_, err := svc.VerifyCode(context.Background(), model.VerifyCodeRequest{Email: "a@b.com"})
	require.ErrorIs(t, err, authsvc.ErrInvalidCode)
}

func TestVerifyCode_NoActiveCode(t *testing.T) {
	svc, _, codes, _ := newService(t, false)
	codes.EXPECT().GetActiveByEmail(gomock.Any(), "a@b.com").
		Return(model.LoginCode{}, errors.New("not found"))

	_, err := svc.VerifyCode(context.Background(), model.VerifyCodeRequest{Email: "a@b.com", Code: "123456"})
	require.ErrorIs(t, err, authsvc.ErrInvalidCode)
}

func TestVerifyCode_WrongCode_IncrementsAttempts(t *testing.T) {
	svc, _, codes, _ := newService(t, false)
	hash, _ := bcrypt.GenerateFromPassword([]byte("000000"), bcrypt.MinCost)
	id := uuid.New()
	codes.EXPECT().GetActiveByEmail(gomock.Any(), "a@b.com").
		Return(model.LoginCode{ID: id, CodeHash: string(hash), Attempts: 1}, nil)
	codes.EXPECT().IncAttempts(gomock.Any(), id).Return(nil)

	_, err := svc.VerifyCode(context.Background(), model.VerifyCodeRequest{Email: "a@b.com", Code: "999999"})
	require.ErrorIs(t, err, authsvc.ErrInvalidCode)
}

func TestVerifyCode_TooManyAttempts_BurnsCode(t *testing.T) {
	svc, _, codes, _ := newService(t, false)
	id := uuid.New()
	codes.EXPECT().GetActiveByEmail(gomock.Any(), "a@b.com").
		Return(model.LoginCode{ID: id, Attempts: 5}, nil)
	codes.EXPECT().MarkUsed(gomock.Any(), id).Return(nil)

	_, err := svc.VerifyCode(context.Background(), model.VerifyCodeRequest{Email: "a@b.com", Code: "123456"})
	require.ErrorIs(t, err, authsvc.ErrInvalidCode)
}

func TestVerifyCode_ExistingUser(t *testing.T) {
	svc, users, codes, _ := newService(t, false)
	hash, _ := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.MinCost)
	id := uuid.New()
	userID := uuid.New()
	codes.EXPECT().GetActiveByEmail(gomock.Any(), "alice@example.com").
		Return(model.LoginCode{ID: id, CodeHash: string(hash)}, nil)
	codes.EXPECT().MarkUsed(gomock.Any(), id).Return(nil)
	users.EXPECT().GetByEmail(gomock.Any(), "alice@example.com").
		Return(model.User{ID: userID, Email: "alice@example.com"}, nil)

	resp, err := svc.VerifyCode(context.Background(), model.VerifyCodeRequest{Email: "alice@example.com", Code: "123456"})
	require.NoError(t, err)
	assert.Equal(t, userID, resp.User.ID)
	assert.NotEmpty(t, resp.Token)
	assertTokenTTL(t, resp.Token, 72*time.Hour)
}

func TestVerifyCode_RememberedSessionUsesLongTTL(t *testing.T) {
	svc, users, codes, _ := newService(t, false)
	hash, _ := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.MinCost)
	id := uuid.New()
	userID := uuid.New()
	codes.EXPECT().GetActiveByEmail(gomock.Any(), "alice@example.com").
		Return(model.LoginCode{ID: id, CodeHash: string(hash)}, nil)
	codes.EXPECT().MarkUsed(gomock.Any(), id).Return(nil)
	users.EXPECT().GetByEmail(gomock.Any(), "alice@example.com").
		Return(model.User{ID: userID, Email: "alice@example.com"}, nil)

	resp, err := svc.VerifyCode(context.Background(), model.VerifyCodeRequest{
		Email: "alice@example.com", Code: "123456", RememberMe: true,
	})
	require.NoError(t, err)
	assertTokenTTL(t, resp.Token, 720*time.Hour)
}

func assertTokenTTL(t *testing.T, tokenString string, want time.Duration) {
	t.Helper()
	token, err := jwt.Parse(tokenString, func(_ *jwt.Token) (any, error) {
		return []byte("secret"), nil
	})
	require.NoError(t, err)
	expiresAt, err := token.Claims.GetExpirationTime()
	require.NoError(t, err)
	issuedAt, err := token.Claims.GetIssuedAt()
	require.NoError(t, err)
	assert.InDelta(t, want.Seconds(), expiresAt.Sub(issuedAt.Time).Seconds(), 1)
}

func TestVerifyCode_NewUser_AutoCreated(t *testing.T) {
	svc, users, codes, _ := newService(t, false)
	hash, _ := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.MinCost)
	id := uuid.New()
	userID := uuid.New()
	codes.EXPECT().GetActiveByEmail(gomock.Any(), "new@example.com").
		Return(model.LoginCode{ID: id, CodeHash: string(hash)}, nil)
	codes.EXPECT().MarkUsed(gomock.Any(), id).Return(nil)
	users.EXPECT().GetByEmail(gomock.Any(), "new@example.com").
		Return(model.User{}, errors.New("not found"))
	users.EXPECT().Create(gomock.Any(), "new", "new@example.com").
		Return(model.User{ID: userID, Name: "new", Email: "new@example.com"}, nil)

	resp, err := svc.VerifyCode(context.Background(), model.VerifyCodeRequest{Email: "new@example.com", Code: "123456"})
	require.NoError(t, err)
	assert.Equal(t, userID, resp.User.ID)
	assert.NotEmpty(t, resp.Token)
}
