package authsvc

//go:generate mockgen -destination=mock/mock.go -package=mock . UserRepo,LoginCodeRepo,Mailer

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

type Mailer interface {
	SendLoginCode(toEmail, code string) error
}
