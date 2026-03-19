package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"meetup/internal/model"
	"meetup/internal/repository"
)

type PollService struct {
	pollRepo  *repository.PollRepository
	eventRepo *repository.EventRepository
}

func NewPollService(pollRepo *repository.PollRepository, eventRepo *repository.EventRepository) *PollService {
	return &PollService{pollRepo: pollRepo, eventRepo: eventRepo}
}

func (s *PollService) List(ctx context.Context, eventID, userID uuid.UUID) ([]model.Poll, error) {
	ok, err := s.eventRepo.IsParticipant(ctx, eventID, userID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, fmt.Errorf("forbidden")
	}
	return s.pollRepo.ListByEvent(ctx, eventID)
}

func (s *PollService) Create(ctx context.Context, eventID, userID uuid.UUID, req model.CreatePollRequest) (model.Poll, error) {
	event, err := s.eventRepo.GetByID(ctx, eventID)
	if err != nil {
		return model.Poll{}, fmt.Errorf("event not found")
	}
	if event.OrganizerID != userID {
		return model.Poll{}, fmt.Errorf("forbidden")
	}
	if req.Question == "" {
		return model.Poll{}, fmt.Errorf("question is required")
	}
	if len(req.Options) < 2 {
		return model.Poll{}, fmt.Errorf("at least 2 options are required")
	}
	return s.pollRepo.Create(ctx, eventID, req, userID)
}

func (s *PollService) Vote(ctx context.Context, eventID, pollID, userID uuid.UUID, req model.VoteRequest) error {
	ok, err := s.eventRepo.IsConfirmedParticipant(ctx, eventID, userID)
	if err != nil {
		return err
	}
	if !ok {
		return fmt.Errorf("forbidden: must be a confirmed participant")
	}

	poll, err := s.pollRepo.GetByID(ctx, pollID)
	if err != nil {
		return fmt.Errorf("poll not found")
	}
	if poll.EventID != eventID {
		return fmt.Errorf("poll does not belong to this event")
	}

	// Validate option belongs to poll
	opt, err := s.pollRepo.GetOption(ctx, req.OptionID)
	if err != nil {
		return fmt.Errorf("option not found")
	}
	if opt.PollID != pollID {
		return fmt.Errorf("option does not belong to this poll")
	}

	return s.pollRepo.Vote(ctx, req.OptionID, userID)
}
