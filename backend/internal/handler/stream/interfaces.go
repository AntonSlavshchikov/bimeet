package streamhandler

//go:generate mockgen -destination=mock/mock.go -package=mock . EventChecker

import (
	"context"

	"github.com/google/uuid"

	"bimeet/internal/realtime"
)

// EventChecker authorizes a subscriber against one event before opening its
// live feed — the same membership rule the chat REST endpoints already
// enforce (see messagesvc.assertParticipant).
type EventChecker interface {
	IsParticipant(ctx context.Context, eventID, userID uuid.UUID) (bool, error)
}

// Hub is the subset of realtime.Hub the SSE handlers need.
type Hub interface {
	SubscribeEvent(eventID uuid.UUID) (<-chan realtime.Envelope, func())
	SubscribeUser(userID uuid.UUID) (<-chan realtime.Envelope, func())
}
