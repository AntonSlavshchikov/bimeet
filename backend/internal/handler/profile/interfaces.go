package profilehandler

import (
	"context"

	"github.com/google/uuid"

	"meetup/internal/model"
)

type ProfileService interface {
	GetMe(ctx context.Context, userID uuid.UUID) (model.User, error)
	UpdateMe(ctx context.Context, userID uuid.UUID, req model.UpdateProfileRequest) (model.User, error)
	GetStats(ctx context.Context, userID uuid.UUID) (model.ProfileStats, error)
}
