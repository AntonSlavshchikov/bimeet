package authsvc

//go:generate mockgen -destination=mock/mock.go -package=mock . UserRepo

import (
	"context"

	"github.com/google/uuid"

	"meetup/internal/model"
)

type UserRepo interface {
	Create(ctx context.Context, name, email, passwordHash string) (model.User, error)
	GetByEmail(ctx context.Context, email string) (model.User, error)
	GetByID(ctx context.Context, id uuid.UUID) (model.User, error)
}
