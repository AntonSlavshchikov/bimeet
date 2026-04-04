package profilesvc

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"meetup/internal/model"
)

type Service struct {
	userRepo UserRepo
}

func New(userRepo UserRepo) *Service {
	return &Service{userRepo: userRepo}
}

func (s *Service) GetMe(ctx context.Context, userID uuid.UUID) (model.User, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return model.User{}, fmt.Errorf("get me: %w", err)
	}
	return user, nil
}

func (s *Service) UpdateMe(ctx context.Context, userID uuid.UUID, req model.UpdateProfileRequest) (model.User, error) {
	user, err := s.userRepo.UpdateProfile(ctx, userID, req)
	if err != nil {
		return model.User{}, fmt.Errorf("update me: %w", err)
	}
	return user, nil
}

func (s *Service) GetStats(ctx context.Context, userID uuid.UUID) (model.ProfileStats, error) {
	stats, err := s.userRepo.GetStats(ctx, userID)
	if err != nil {
		return model.ProfileStats{}, fmt.Errorf("get stats: %w", err)
	}
	return stats, nil
}
