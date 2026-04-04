package profilesvc

import (
	"context"

	"github.com/google/uuid"

	"meetup/internal/model"
)

type UserRepo interface {
	GetByID(ctx context.Context, id uuid.UUID) (model.User, error)
	UpdateProfile(ctx context.Context, id uuid.UUID, req model.UpdateProfileRequest) (model.User, error)
	GetStats(ctx context.Context, id uuid.UUID) (model.ProfileStats, error)
}
