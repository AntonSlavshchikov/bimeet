package authhandler

//go:generate mockgen -destination=mock/mock.go -package=mock . AuthService

import (
	"context"

	"github.com/google/uuid"

	"bimeet/internal/model"
)

type AuthService interface {
	RequestCode(ctx context.Context, req model.RequestCodeRequest) error
	VerifyCode(ctx context.Context, req model.VerifyCodeRequest, userAgent string) (model.AuthResponse, error)
	Refresh(ctx context.Context, refreshToken, userAgent string) (model.RefreshResponse, error)
	RevokeRefreshToken(ctx context.Context, refreshToken string) error
	ListSessions(ctx context.Context, userID, currentSessionID uuid.UUID) ([]model.AuthSession, error)
	RevokeSession(ctx context.Context, userID, sessionID uuid.UUID) error
	RevokeOtherSessions(ctx context.Context, userID, currentSessionID uuid.UUID) error
}
