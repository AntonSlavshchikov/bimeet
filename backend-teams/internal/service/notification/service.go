package notificationsvc

import (
	"context"

	"github.com/google/uuid"

	"bimeet-teams/internal/model"
)

type NotificationRepo interface {
	ListByUser(ctx context.Context, userID uuid.UUID) ([]model.Notification, error)
	MarkRead(ctx context.Context, userID, id uuid.UUID) error
	MarkAllRead(ctx context.Context, userID uuid.UUID) error
}

type Service struct {
	repo NotificationRepo
}

func New(repo NotificationRepo) *Service {
	return &Service{repo: repo}
}

func (s *Service) List(ctx context.Context, userID uuid.UUID) ([]model.Notification, error) {
	return s.repo.ListByUser(ctx, userID)
}

func (s *Service) MarkRead(ctx context.Context, userID, id uuid.UUID) error {
	return s.repo.MarkRead(ctx, userID, id)
}

func (s *Service) MarkAllRead(ctx context.Context, userID uuid.UUID) error {
	return s.repo.MarkAllRead(ctx, userID)
}
