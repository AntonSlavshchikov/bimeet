package service

import (
	"context"
	"fmt"
	"math"

	"github.com/google/uuid"

	"meetup/internal/model"
	"meetup/internal/repository"
)

type CollectionService struct {
	collectionRepo *repository.CollectionRepository
	eventRepo      *repository.EventRepository
}

func NewCollectionService(collectionRepo *repository.CollectionRepository, eventRepo *repository.EventRepository) *CollectionService {
	return &CollectionService{collectionRepo: collectionRepo, eventRepo: eventRepo}
}

func (s *CollectionService) List(ctx context.Context, eventID, userID uuid.UUID) ([]model.Collection, error) {
	ok, err := s.eventRepo.IsParticipant(ctx, eventID, userID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, fmt.Errorf("forbidden")
	}
	return s.collectionRepo.ListByEvent(ctx, eventID)
}

func (s *CollectionService) Create(ctx context.Context, eventID, userID uuid.UUID, req model.CreateCollectionRequest) (model.Collection, error) {
	event, err := s.eventRepo.GetByID(ctx, eventID)
	if err != nil {
		return model.Collection{}, fmt.Errorf("event not found")
	}
	if event.OrganizerID != userID {
		return model.Collection{}, fmt.Errorf("forbidden")
	}
	if req.Title == "" {
		return model.Collection{}, fmt.Errorf("title is required")
	}
	if req.TargetAmount < 0 {
		return model.Collection{}, fmt.Errorf("target_amount must be non-negative")
	}
	return s.collectionRepo.Create(ctx, eventID, req, userID)
}

func (s *CollectionService) Delete(ctx context.Context, eventID, collectionID, userID uuid.UUID) error {
	event, err := s.eventRepo.GetByID(ctx, eventID)
	if err != nil {
		return fmt.Errorf("event not found")
	}
	if event.OrganizerID != userID {
		return fmt.Errorf("forbidden")
	}

	col, err := s.collectionRepo.GetByID(ctx, collectionID)
	if err != nil {
		return fmt.Errorf("collection not found")
	}
	if col.EventID != eventID {
		return fmt.Errorf("collection does not belong to this event")
	}

	return s.collectionRepo.Delete(ctx, collectionID)
}

func (s *CollectionService) ToggleContribution(ctx context.Context, eventID, collectionID, userID uuid.UUID) (model.CollectionContribution, error) {
	ok, err := s.eventRepo.IsConfirmedParticipant(ctx, eventID, userID)
	if err != nil {
		return model.CollectionContribution{}, err
	}
	if !ok {
		return model.CollectionContribution{}, fmt.Errorf("forbidden: must be a confirmed participant")
	}

	col, err := s.collectionRepo.GetByID(ctx, collectionID)
	if err != nil {
		return model.CollectionContribution{}, fmt.Errorf("collection not found")
	}
	if col.EventID != eventID {
		return model.CollectionContribution{}, fmt.Errorf("collection does not belong to this event")
	}

	return s.collectionRepo.ToggleContribution(ctx, collectionID, userID)
}

func (s *CollectionService) Summary(ctx context.Context, eventID, userID uuid.UUID) (model.EventCollectionsSummaryResponse, error) {
	ok, err := s.eventRepo.IsParticipant(ctx, eventID, userID)
	if err != nil {
		return model.EventCollectionsSummaryResponse{}, err
	}
	if !ok {
		return model.EventCollectionsSummaryResponse{}, fmt.Errorf("forbidden")
	}

	confirmedCount, err := s.eventRepo.CountConfirmedParticipants(ctx, eventID)
	if err != nil {
		return model.EventCollectionsSummaryResponse{}, err
	}

	collections, err := s.collectionRepo.ListByEvent(ctx, eventID)
	if err != nil {
		return model.EventCollectionsSummaryResponse{}, err
	}

	var summaries []model.CollectionSummary
	var grandTotal, totalPaid float64

	for _, col := range collections {
		paidCount, err := s.collectionRepo.CountPaidContributions(ctx, col.ID)
		if err != nil {
			return model.EventCollectionsSummaryResponse{}, err
		}

		var perPerson float64
		if confirmedCount > 0 {
			perPerson = math.Ceil(col.TargetAmount / float64(confirmedCount))
		}

		collectionPaid := float64(paidCount) * perPerson
		remaining := col.TargetAmount - collectionPaid
		if remaining < 0 {
			remaining = 0
		}

		summaries = append(summaries, model.CollectionSummary{
			CollectionID: col.ID,
			Title:        col.Title,
			TargetAmount: col.TargetAmount,
			PerPerson:    perPerson,
			PaidCount:    paidCount,
			TotalCount:   confirmedCount,
			TotalPaid:    collectionPaid,
			Remaining:    remaining,
		})

		grandTotal += col.TargetAmount
		totalPaid += collectionPaid
	}

	return model.EventCollectionsSummaryResponse{
		Collections: summaries,
		GrandTotal:  grandTotal,
		TotalPaid:   totalPaid,
		Remaining:   grandTotal - totalPaid,
	}, nil
}
