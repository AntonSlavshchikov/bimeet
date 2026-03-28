package notificationsvc

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"meetup/internal/model"
)

type Service struct {
	notificationRepo NotificationRepo
}

func New(notificationRepo NotificationRepo) *Service {
	return &Service{notificationRepo: notificationRepo}
}

func (s *Service) List(ctx context.Context, userID uuid.UUID) ([]model.Notification, error) {
	return s.notificationRepo.ListForUser(ctx, userID)
}

func (s *Service) MarkRead(ctx context.Context, notifID, userID uuid.UUID) (model.Notification, error) {
	n, err := s.notificationRepo.GetByID(ctx, notifID)
	if err != nil {
		return model.Notification{}, fmt.Errorf("notification not found")
	}
	if n.UserID != userID {
		return model.Notification{}, fmt.Errorf("forbidden")
	}
	return s.notificationRepo.MarkRead(ctx, notifID)
}
