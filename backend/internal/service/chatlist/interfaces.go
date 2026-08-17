package chatlistsvc

//go:generate mockgen -destination=mock/mock.go -package=mock . ChatListRepo

import (
	"context"

	"github.com/google/uuid"

	"bimeet/internal/model"
)

type ChatListRepo interface {
	ListForUser(ctx context.Context, userID uuid.UUID) ([]model.ChatSummary, error)
}
