package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"meetup/internal/model"
	"meetup/internal/repository"
)

type ItemService struct {
	itemRepo  *repository.ItemRepository
	eventRepo *repository.EventRepository
}

func NewItemService(itemRepo *repository.ItemRepository, eventRepo *repository.EventRepository) *ItemService {
	return &ItemService{itemRepo: itemRepo, eventRepo: eventRepo}
}

func (s *ItemService) List(ctx context.Context, eventID, userID uuid.UUID) ([]model.Item, error) {
	ok, err := s.eventRepo.IsParticipant(ctx, eventID, userID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, fmt.Errorf("forbidden")
	}
	return s.itemRepo.ListByEvent(ctx, eventID)
}

func (s *ItemService) Create(ctx context.Context, eventID, userID uuid.UUID, req model.CreateItemRequest) (model.Item, error) {
	ok, err := s.eventRepo.IsParticipant(ctx, eventID, userID)
	if err != nil {
		return model.Item{}, err
	}
	if !ok {
		return model.Item{}, fmt.Errorf("forbidden")
	}
	if req.Name == "" {
		return model.Item{}, fmt.Errorf("name is required")
	}
	return s.itemRepo.Create(ctx, eventID, req)
}

func (s *ItemService) UpdateAssignment(ctx context.Context, eventID, itemID, userID uuid.UUID, req model.UpdateItemRequest) (model.Item, error) {
	ok, err := s.eventRepo.IsConfirmedParticipant(ctx, eventID, userID)
	if err != nil {
		return model.Item{}, err
	}
	if !ok {
		return model.Item{}, fmt.Errorf("forbidden: must be a confirmed participant")
	}

	item, err := s.itemRepo.GetByID(ctx, itemID)
	if err != nil {
		return model.Item{}, fmt.Errorf("item not found")
	}
	if item.EventID != eventID {
		return model.Item{}, fmt.Errorf("item does not belong to this event")
	}

	// Participants may only assign/unassign themselves
	if req.AssignedTo != nil && *req.AssignedTo != userID {
		// Check if the caller is the organizer
		event, err := s.eventRepo.GetByID(ctx, eventID)
		if err != nil {
			return model.Item{}, err
		}
		if event.OrganizerID != userID {
			return model.Item{}, fmt.Errorf("forbidden: can only assign items to yourself")
		}
	}

	return s.itemRepo.UpdateAssignment(ctx, itemID, req.AssignedTo)
}
