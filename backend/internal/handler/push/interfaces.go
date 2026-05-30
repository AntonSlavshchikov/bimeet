package pushhandler

//go:generate mockgen -destination=mock/mock.go -package=mock . PushService

import (
	"context"

	"github.com/google/uuid"

	"bimeet/internal/model"
)

type PushService interface {
	PublicKey() string
	Subscribe(ctx context.Context, userID uuid.UUID, req model.PushSubscribeRequest, userAgent string) error
	Unsubscribe(ctx context.Context, endpoint string) error
	Test(ctx context.Context, userID uuid.UUID) error
}
