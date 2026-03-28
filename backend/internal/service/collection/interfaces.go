package collectionsvc

//go:generate mockgen -destination=mock/mock.go -package=mock . CollectionRepo,EventRepo

import (
	"context"

	"github.com/google/uuid"

	"meetup/internal/model"
)

type CollectionRepo interface {
	Create(ctx context.Context, eventID uuid.UUID, req model.CreateCollectionRequest, createdBy uuid.UUID) (model.Collection, error)
	GetByID(ctx context.Context, id uuid.UUID) (model.Collection, error)
	ListByEvent(ctx context.Context, eventID uuid.UUID) ([]model.Collection, error)
	Delete(ctx context.Context, id uuid.UUID) error
	ToggleContribution(ctx context.Context, collectionID, userID uuid.UUID) (model.CollectionContribution, error)
	CountPaidContributions(ctx context.Context, collectionID uuid.UUID) (int, error)
}

type EventRepo interface {
	GetByID(ctx context.Context, id uuid.UUID) (model.Event, error)
	IsParticipant(ctx context.Context, eventID, userID uuid.UUID) (bool, error)
	IsConfirmedParticipant(ctx context.Context, eventID, userID uuid.UUID) (bool, error)
	CountConfirmedParticipants(ctx context.Context, eventID uuid.UUID) (int, error)
}
