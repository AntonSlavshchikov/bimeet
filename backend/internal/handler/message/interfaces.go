package messagehandler

//go:generate mockgen -destination=mock/mock.go -package=mock . MessageService

import (
	"context"

	"github.com/google/uuid"

	"bimeet/internal/model"
)

type MessageService interface {
	List(ctx context.Context, eventID, userID uuid.UUID, limit int) ([]model.Message, error)
	Post(ctx context.Context, eventID, userID uuid.UUID, req model.PostMessageRequest) (model.Message, error)
	Delete(ctx context.Context, eventID, messageID, userID uuid.UUID) error
	MarkRead(ctx context.Context, eventID, userID uuid.UUID) error
	UnreadCount(ctx context.Context, eventID, userID uuid.UUID) (int, error)
}
