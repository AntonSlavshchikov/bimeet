package callsvc

//go:generate mockgen -destination=mock/mock.go -package=mock . EventChecker,UserLookup,Hub

import (
	"context"

	"github.com/google/uuid"

	"bimeet/internal/model"
)

// EventChecker answers "is this user a participant of this event" — the
// only rule deciding who may call whom.
type EventChecker interface {
	IsParticipant(ctx context.Context, eventID, userID uuid.UUID) (bool, error)
}

// UserLookup resolves the recipient by email and the sender's name/email.
type UserLookup interface {
	GetByID(ctx context.Context, id uuid.UUID) (model.User, error)
	GetByEmail(ctx context.Context, email string) (model.User, error)
}

// Hub is the subset of realtime.Hub used for signaling.
type Hub interface {
	PublishCall(userID uuid.UUID, sig model.CallSignal)
	IsUserOnline(userID uuid.UUID) bool
}
