package messagesvc

//go:generate mockgen -destination=mock/mock.go -package=mock . MessageRepo,EventRepo,Notifier,Uploader,Publisher

import (
	"context"
	"io"
	"time"

	"github.com/google/uuid"

	"bimeet/internal/model"
)

type MessageRepo interface {
	Create(ctx context.Context, eventID, userID uuid.UUID, body string, replyToID *uuid.UUID, imageURL *string) (model.Message, error)
	GetByID(ctx context.Context, id, userID uuid.UUID) (model.Message, error)
	ListByEvent(ctx context.Context, eventID, userID uuid.UUID, before *time.Time, limit int) ([]model.Message, error)
	SoftDelete(ctx context.Context, id uuid.UUID) error
	MarkRead(ctx context.Context, eventID, userID uuid.UUID) error
	CountUnread(ctx context.Context, eventID, userID uuid.UUID) (int, error)
	ToggleReaction(ctx context.Context, messageID, userID uuid.UUID, emoji string) (added bool, err error)
}

// Uploader stores a chat image and returns its public URL.
type Uploader interface {
	Upload(ctx context.Context, key, contentType string, body io.Reader) (string, error)
}

type EventRepo interface {
	GetByID(ctx context.Context, id uuid.UUID) (model.Event, error)
	IsParticipant(ctx context.Context, eventID, userID uuid.UUID) (bool, error)
	ListParticipants(ctx context.Context, eventID uuid.UUID) ([]model.EventParticipant, error)
	// ListMemberNames maps each member's lowercased first name (organizer +
	// non-declined participants) to their user ID, for resolving @mentions.
	ListMemberNames(ctx context.Context, eventID uuid.UUID) (map[string]uuid.UUID, error)
}

// Notifier upserts a collapsed chat notification (and fans out a web push):
// repeated messages for the same event bump a counter instead of stacking.
// Create is used for mentions — each one is its own notification, never
// collapsed into the running chat-message counter.
type Notifier interface {
	Create(ctx context.Context, userID uuid.UUID, eventID *uuid.UUID, notifType, message string) (model.Notification, error)
	UpsertChatNotification(ctx context.Context, userID, eventID uuid.UUID, notifType, message string) (model.Notification, error)
	MarkReadByEventAndType(ctx context.Context, userID, eventID uuid.UUID, notifType string) error
}

// Publisher pushes realtime updates to connected SSE subscribers — the live
// per-event feed and the cross-event chat-list activity ping.
type Publisher interface {
	PublishMessage(eventID uuid.UUID, msg model.Message)
	PublishActivity(userIDs []uuid.UUID, eventID uuid.UUID)
}
