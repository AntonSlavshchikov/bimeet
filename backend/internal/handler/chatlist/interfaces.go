package chatlisthandler

//go:generate mockgen -destination=mock/mock.go -package=mock . ChatListService

import (
	"context"

	"github.com/google/uuid"

	"bimeet/internal/model"
)

type ChatListService interface {
	List(ctx context.Context, userID uuid.UUID) ([]model.ChatSummary, error)
}
