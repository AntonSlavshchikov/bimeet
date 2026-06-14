package messagesvc

//go:generate mockgen -destination=mock/mock.go -package=mock . MessageRepo,EventRepo,Notifier

import (
	"context"
	"time"

	"github.com/google/uuid"

	"bimeet/internal/model"
)

type MessageRepo interface {
	Create(ctx context.Context, eventID, userID uuid.UUID, body string, replyToID *uuid.UUID) (model.Message, error)
	GetByID(ctx context.Context, id, userID uuid.UUID) (model.Message, error)
	ListByEvent(ctx context.Context, eventID, userID uuid.UUID, before *time.Time, limit int) ([]model.Message, error)
	SoftDelete(ctx context.Context, id uuid.UUID) error
	MarkRead(ctx context.Context, eventID, userID uuid.UUID) error
	CountUnread(ctx context.Context, eventID, userID uuid.UUID) (int, error)
}

type EventRepo interface {
	GetByID(ctx context.Context, id uuid.UUID) (model.Event, error)
	IsParticipant(ctx context.Context, eventID, userID uuid.UUID) (bool, error)
	ListParticipants(ctx context.Context, eventID uuid.UUID) ([]model.EventParticipant, error)
}

// Notifier upserts a collapsed chat notification (and fans out a web push):
// repeated messages for the same event bump a counter instead of stacking.
type Notifier interface {
	UpsertChatNotification(ctx context.Context, userID, eventID uuid.UUID, notifType, message string) (model.Notification, error)
	MarkReadByEventAndType(ctx context.Context, userID, eventID uuid.UUID, notifType string) error
}
