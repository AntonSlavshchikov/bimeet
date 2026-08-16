package messagehandler

//go:generate mockgen -destination=mock/mock.go -package=mock . MessageService

import (
	"context"
	"mime/multipart"
	"time"

	"github.com/google/uuid"

	"bimeet/internal/model"
)

type MessageService interface {
	List(ctx context.Context, eventID, userID uuid.UUID, before *time.Time, limit int) ([]model.Message, error)
	Post(ctx context.Context, eventID, userID uuid.UUID, req model.PostMessageRequest) (model.Message, error)
	PostImage(ctx context.Context, eventID, userID uuid.UUID, caption string, file multipart.File, header *multipart.FileHeader) (model.Message, error)
	Delete(ctx context.Context, eventID, messageID, userID uuid.UUID) error
	MarkRead(ctx context.Context, eventID, userID uuid.UUID) error
	UnreadCount(ctx context.Context, eventID, userID uuid.UUID) (int, error)
	ToggleReaction(ctx context.Context, eventID, messageID, userID uuid.UUID, emoji string) (model.Message, error)
}
