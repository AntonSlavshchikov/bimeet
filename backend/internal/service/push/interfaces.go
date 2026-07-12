package pushsvc

//go:generate mockgen -destination=mock/mock.go -package=mock . SubscriptionRepo

import (
	"context"

	"github.com/google/uuid"

	"bimeet/internal/model"
)

type SubscriptionRepo interface {
	Upsert(ctx context.Context, userID uuid.UUID, endpoint, p256dh, auth, userAgent string) error
	ListByUser(ctx context.Context, userID uuid.UUID) ([]model.PushSubscription, error)
	DeleteByEndpoint(ctx context.Context, userID uuid.UUID, endpoint string) error
}
