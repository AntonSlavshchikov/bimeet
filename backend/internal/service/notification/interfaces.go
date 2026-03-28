package notificationsvc

//go:generate mockgen -destination=mock/mock.go -package=mock . NotificationRepo

import (
	"context"

	"github.com/google/uuid"

	"meetup/internal/model"
)

type NotificationRepo interface {
	ListForUser(ctx context.Context, userID uuid.UUID) ([]model.Notification, error)
	GetByID(ctx context.Context, id uuid.UUID) (model.Notification, error)
	MarkRead(ctx context.Context, id uuid.UUID) (model.Notification, error)
}
