package collectionhandler

//go:generate mockgen -destination=mock/mock.go -package=mock . CollectionService

import (
	"context"

	"github.com/google/uuid"

	"meetup/internal/model"
)

type CollectionService interface {
	List(ctx context.Context, eventID, userID uuid.UUID) ([]model.Collection, error)
	Create(ctx context.Context, eventID, userID uuid.UUID, req model.CreateCollectionRequest) (model.Collection, error)
	Delete(ctx context.Context, eventID, collectionID, userID uuid.UUID) error
	ToggleContribution(ctx context.Context, eventID, collectionID, userID uuid.UUID) (model.CollectionContribution, error)
	Summary(ctx context.Context, eventID, userID uuid.UUID) (model.EventCollectionsSummaryResponse, error)
}
