package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"meetup/internal/model"
	"meetup/internal/repository"
)

type NotificationService struct {
	notificationRepo *repository.NotificationRepository
}

func NewNotificationService(notificationRepo *repository.NotificationRepository) *NotificationService {
	return &NotificationService{notificationRepo: notificationRepo}
}

func (s *NotificationService) List(ctx context.Context, userID uuid.UUID) ([]model.Notification, error) {
	return s.notificationRepo.ListForUser(ctx, userID)
}

func (s *NotificationService) MarkRead(ctx context.Context, notifID, userID uuid.UUID) (model.Notification, error) {
	n, err := s.notificationRepo.GetByID(ctx, notifID)
	if err != nil {
		return model.Notification{}, fmt.Errorf("notification not found")
	}
	if n.UserID != userID {
		return model.Notification{}, fmt.Errorf("forbidden")
	}
	return s.notificationRepo.MarkRead(ctx, notifID)
}
