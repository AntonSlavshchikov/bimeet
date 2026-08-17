package chatlistsvc

import (
	"context"

	"github.com/google/uuid"

	"bimeet/internal/model"
)

type Service struct {
	repo ChatListRepo
}

func New(repo ChatListRepo) *Service {
	return &Service{repo: repo}
}

// List returns every event the caller organizes or participates in, each
// with its most recent message and unread count, newest activity first.
// The repository query itself scopes rows to the caller, so there is no
// separate membership check here.
func (s *Service) List(ctx context.Context, userID uuid.UUID) ([]model.ChatSummary, error) {
	return s.repo.ListForUser(ctx, userID)
}
