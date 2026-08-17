package authsvc

//go:generate mockgen -destination=mock/mock.go -package=mock . UserRepo,LoginCodeRepo,RefreshTokenRepo,Mailer

import (
	"context"
	"time"

	"github.com/google/uuid"

	"bimeet/internal/model"
)

type UserRepo interface {
	Create(ctx context.Context, name, email string) (model.User, error)
	GetByEmail(ctx context.Context, email string) (model.User, error)
	GetByID(ctx context.Context, id uuid.UUID) (model.User, error)
}

type LoginCodeRepo interface {
	Create(ctx context.Context, email, codeHash string, expiresAt time.Time) (model.LoginCode, error)
	GetActiveByEmail(ctx context.Context, email string) (model.LoginCode, error)
	IncAttempts(ctx context.Context, id uuid.UUID) error
	MarkUsed(ctx context.Context, id uuid.UUID) error
	InvalidateByEmail(ctx context.Context, email string) error
}

type RefreshTokenRepo interface {
	Create(ctx context.Context, userID uuid.UUID, tokenHash, userAgent string, expiresAt time.Time) (model.AuthSession, error)
	Rotate(ctx context.Context, currentHash, nextHash, userAgent string) (model.AuthSession, bool, error)
	Revoke(ctx context.Context, tokenHash string) error
	ListByUser(ctx context.Context, userID uuid.UUID) ([]model.AuthSession, error)
	RevokeByID(ctx context.Context, userID, sessionID uuid.UUID) (bool, error)
	RevokeOthers(ctx context.Context, userID, currentSessionID uuid.UUID) error
}

type Mailer interface {
	SendLoginCode(toEmail, code string) error
}
