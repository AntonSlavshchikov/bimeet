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

func newService(t *testing.T, authTest bool) (*authsvc.Service, *mock.MockUserRepo, *mock.MockLoginCodeRepo, *mock.MockRefreshTokenRepo, *mock.MockMailer) {
	t.Helper()
	ctrl := gomock.NewController(t)
	users := mock.NewMockUserRepo(ctrl)
	codes := mock.NewMockLoginCodeRepo(ctrl)
	refreshTokens := mock.NewMockRefreshTokenRepo(ctrl)
	mailer := mock.NewMockMailer(ctrl)
	return authsvc.New(users, codes, refreshTokens, mailer, "secret", 24, authTest), users, codes, refreshTokens, mailer
}

// ─── RequestCode ─────────────────────────────────────────────────────────────

func TestRequestCode_MissingEmail(t *testing.T) {
	svc, _, _, _, _ := newService(t, false)
	err := svc.RequestCode(context.Background(), model.RequestCodeRequest{})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "required")
}

func TestRequestCode_InvalidEmail(t *testing.T) {
	svc, _, _, _, _ := newService(t, false)
	err := svc.RequestCode(context.Background(), model.RequestCodeRequest{Email: "not-an-email"})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "email")
}

func TestRequestCode_Cooldown(t *testing.T) {
	svc, _, codes, _, _ := newService(t, false)
	codes.EXPECT().GetActiveByEmail(gomock.Any(), "alice@example.com").
		Return(model.LoginCode{CreatedAt: time.Now().Add(-10 * time.Second)}, nil)

	err := svc.RequestCode(context.Background(), model.RequestCodeRequest{Email: "alice@example.com"})
	require.ErrorIs(t, err, authsvc.ErrCooldown)
}

func TestRequestCode_HappyPath_SendsEmail(t *testing.T) {
	svc, _, codes, _, mailer := newService(t, false)

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
	svc, _, codes, _, _ := newService(t, true) // authTest = true → no mailer call expected

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
	svc, _, _, _, _ := newService(t, false)
	_, err := svc.VerifyCode(context.Background(), model.VerifyCodeRequest{Email: "a@b.com"}, "")
	require.ErrorIs(t, err, authsvc.ErrInvalidCode)
}

func TestVerifyCode_NoActiveCode(t *testing.T) {
	svc, _, codes, _, _ := newService(t, false)
	codes.EXPECT().GetActiveByEmail(gomock.Any(), "a@b.com").
		Return(model.LoginCode{}, errors.New("not found"))

	_, err := svc.VerifyCode(context.Background(), model.VerifyCodeRequest{Email: "a@b.com", Code: "123456"}, "")
	require.ErrorIs(t, err, authsvc.ErrInvalidCode)
}

func TestVerifyCode_WrongCode_IncrementsAttempts(t *testing.T) {
	svc, _, codes, _, _ := newService(t, false)
	hash, _ := bcrypt.GenerateFromPassword([]byte("000000"), bcrypt.MinCost)
	id := uuid.New()
	codes.EXPECT().GetActiveByEmail(gomock.Any(), "a@b.com").
		Return(model.LoginCode{ID: id, CodeHash: string(hash), Attempts: 1}, nil)
	codes.EXPECT().IncAttempts(gomock.Any(), id).Return(nil)

	_, err := svc.VerifyCode(context.Background(), model.VerifyCodeRequest{Email: "a@b.com", Code: "999999"}, "")
	require.ErrorIs(t, err, authsvc.ErrInvalidCode)
}

func TestVerifyCode_TooManyAttempts_BurnsCode(t *testing.T) {
	svc, _, codes, _, _ := newService(t, false)
	id := uuid.New()
	codes.EXPECT().GetActiveByEmail(gomock.Any(), "a@b.com").
		Return(model.LoginCode{ID: id, Attempts: 5}, nil)
	codes.EXPECT().MarkUsed(gomock.Any(), id).Return(nil)

	_, err := svc.VerifyCode(context.Background(), model.VerifyCodeRequest{Email: "a@b.com", Code: "123456"}, "")
	require.ErrorIs(t, err, authsvc.ErrInvalidCode)
}

func TestVerifyCode_ExistingUser(t *testing.T) {
	svc, users, codes, refreshTokens, _ := newService(t, false)
	hash, _ := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.MinCost)
	id := uuid.New()
	userID := uuid.New()
	sessionID := uuid.New()
	codes.EXPECT().GetActiveByEmail(gomock.Any(), "alice@example.com").
		Return(model.LoginCode{ID: id, CodeHash: string(hash)}, nil)
	codes.EXPECT().MarkUsed(gomock.Any(), id).Return(nil)
	users.EXPECT().GetByEmail(gomock.Any(), "alice@example.com").
		Return(model.User{ID: userID, Email: "alice@example.com"}, nil)
	refreshTokens.EXPECT().Create(gomock.Any(), userID, gomock.Any(), "Chrome", gomock.Any()).
		Return(model.AuthSession{ID: sessionID, UserID: userID}, nil)

	resp, err := svc.VerifyCode(context.Background(), model.VerifyCodeRequest{Email: "alice@example.com", Code: "123456"}, "Chrome")
	require.NoError(t, err)
	assert.Equal(t, userID, resp.User.ID)
	assert.NotEmpty(t, resp.Token)
	assert.NotEmpty(t, resp.RefreshToken)
	parsed, _, err := new(jwt.Parser).ParseUnverified(resp.Token, jwt.MapClaims{})
	require.NoError(t, err)
	claims := parsed.Claims.(jwt.MapClaims)
	expiresAt, err := claims.GetExpirationTime()
	require.NoError(t, err)
	issuedAt, err := claims.GetIssuedAt()
	require.NoError(t, err)
	assert.Equal(t, 24*time.Hour, expiresAt.Sub(issuedAt.Time))
	assert.Equal(t, sessionID.String(), claims["sid"])
}

func TestVerifyCode_NewUser_AutoCreated(t *testing.T) {
	svc, users, codes, refreshTokens, _ := newService(t, false)
	hash, _ := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.MinCost)
	id := uuid.New()
	userID := uuid.New()
	sessionID := uuid.New()
	codes.EXPECT().GetActiveByEmail(gomock.Any(), "new@example.com").
		Return(model.LoginCode{ID: id, CodeHash: string(hash)}, nil)
	codes.EXPECT().MarkUsed(gomock.Any(), id).Return(nil)
	users.EXPECT().GetByEmail(gomock.Any(), "new@example.com").
		Return(model.User{}, errors.New("not found"))
	users.EXPECT().Create(gomock.Any(), "new", "new@example.com").
		Return(model.User{ID: userID, Name: "new", Email: "new@example.com"}, nil)
	refreshTokens.EXPECT().Create(gomock.Any(), userID, gomock.Any(), "", gomock.Any()).
		Return(model.AuthSession{ID: sessionID, UserID: userID}, nil)

	resp, err := svc.VerifyCode(context.Background(), model.VerifyCodeRequest{Email: "new@example.com", Code: "123456"}, "")
	require.NoError(t, err)
	assert.Equal(t, userID, resp.User.ID)
	assert.NotEmpty(t, resp.Token)
	assert.NotEmpty(t, resp.RefreshToken)
}

func TestRefresh_RotatesToken(t *testing.T) {
	svc, _, _, refreshTokens, _ := newService(t, false)
	userID := uuid.New()
	sessionID := uuid.New()
	refreshTokens.EXPECT().Rotate(gomock.Any(), gomock.Any(), gomock.Any(), "Chrome").
		Return(model.AuthSession{ID: sessionID, UserID: userID}, true, nil)

	resp, err := svc.Refresh(context.Background(), "current-refresh-token", "Chrome")

	require.NoError(t, err)
	assert.NotEmpty(t, resp.Token)
	assert.NotEmpty(t, resp.RefreshToken)
	assert.NotEqual(t, "current-refresh-token", resp.RefreshToken)
	parsed, _, err := new(jwt.Parser).ParseUnverified(resp.Token, jwt.MapClaims{})
	require.NoError(t, err)
	assert.Equal(t, sessionID.String(), parsed.Claims.(jwt.MapClaims)["sid"])
}

func TestRefresh_RejectsUsedToken(t *testing.T) {
	svc, _, _, refreshTokens, _ := newService(t, false)
	refreshTokens.EXPECT().Rotate(gomock.Any(), gomock.Any(), gomock.Any(), "").
		Return(model.AuthSession{}, false, nil)

	_, err := svc.Refresh(context.Background(), "used-refresh-token", "")

	require.ErrorIs(t, err, authsvc.ErrInvalidRefreshToken)
}

func TestRevokeRefreshToken(t *testing.T) {
	svc, _, _, refreshTokens, _ := newService(t, false)
	refreshTokens.EXPECT().Revoke(gomock.Any(), gomock.Any()).Return(nil)

	require.NoError(t, svc.RevokeRefreshToken(context.Background(), "refresh-token"))
}

func TestListSessions_MarksCurrent(t *testing.T) {
	svc, _, _, refreshTokens, _ := newService(t, false)
	userID := uuid.New()
	currentID := uuid.New()
	otherID := uuid.New()
	refreshTokens.EXPECT().ListByUser(gomock.Any(), userID).Return([]model.AuthSession{
		{ID: otherID, UserID: userID},
		{ID: currentID, UserID: userID},
	}, nil)

	sessions, err := svc.ListSessions(context.Background(), userID, currentID)

	require.NoError(t, err)
	assert.False(t, sessions[0].Current)
	assert.True(t, sessions[1].Current)
}

func TestRevokeSession_RejectsUnknownOrForeignSession(t *testing.T) {
	svc, _, _, refreshTokens, _ := newService(t, false)
	userID := uuid.New()
	sessionID := uuid.New()
	refreshTokens.EXPECT().RevokeByID(gomock.Any(), userID, sessionID).Return(false, nil)

	err := svc.RevokeSession(context.Background(), userID, sessionID)

	require.ErrorIs(t, err, authsvc.ErrSessionNotFound)
}

func TestRevokeOtherSessions(t *testing.T) {
	svc, _, _, refreshTokens, _ := newService(t, false)
	userID := uuid.New()
	currentID := uuid.New()
	refreshTokens.EXPECT().RevokeOthers(gomock.Any(), userID, currentID).Return(nil)

	require.NoError(t, svc.RevokeOtherSessions(context.Background(), userID, currentID))
}
