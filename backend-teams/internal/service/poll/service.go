package pollsvc

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"

	"bimeet-teams/internal/model"
)

var (
	ErrNotFound  = errors.New("event not found")
	ErrForbidden = errors.New("forbidden")
)

type ValidationError struct{ Msg string }

func (e ValidationError) Error() string { return e.Msg }

// EventAccessor lets the poll service enforce company + membership without
// duplicating the events table query logic.
type EventAccessor interface {
	GetByID(ctx context.Context, id uuid.UUID) (model.Event, error)
	IsParticipant(ctx context.Context, eventID, userID uuid.UUID) (bool, error)
}

type PollRepo interface {
	Create(ctx context.Context, eventID, createdBy uuid.UUID, question string, options []string) (model.PollInfo, error)
	Vote(ctx context.Context, eventID, pollID, optionID, userID uuid.UUID) error
}

type Service struct {
	events EventAccessor
	polls  PollRepo
}

func New(events EventAccessor, polls PollRepo) *Service {
	return &Service{events: events, polls: polls}
}

func (s *Service) Create(ctx context.Context, eventID, companyID, userID uuid.UUID, req model.CreatePollRequest) (model.PollInfo, error) {
	if err := s.requireAccess(ctx, eventID, companyID, userID); err != nil {
		return model.PollInfo{}, err
	}
	question := strings.TrimSpace(req.Question)
	if question == "" {
		return model.PollInfo{}, ValidationError{"question is required"}
	}
	options := cleanOptions(req.Options)
	if len(options) < 2 {
		return model.PollInfo{}, ValidationError{"at least two options are required"}
	}
	return s.polls.Create(ctx, eventID, userID, question, options)
}

func (s *Service) Vote(ctx context.Context, eventID, companyID, userID, pollID, optionID uuid.UUID) error {
	if err := s.requireAccess(ctx, eventID, companyID, userID); err != nil {
		return err
	}
	if err := s.polls.Vote(ctx, eventID, pollID, optionID, userID); err != nil {
		return ValidationError{"invalid poll option"}
	}
	return nil
}

// requireAccess checks the event is in the caller's company and the caller is
// the organizer or a participant.
func (s *Service) requireAccess(ctx context.Context, eventID, companyID, userID uuid.UUID) error {
	ev, err := s.events.GetByID(ctx, eventID)
	if err != nil || ev.CompanyID != companyID {
		return ErrNotFound
	}
	if ev.OrganizerID == userID {
		return nil
	}
	isPart, err := s.events.IsParticipant(ctx, eventID, userID)
	if err != nil {
		return err
	}
	if !isPart {
		return ErrForbidden
	}
	return nil
}

func cleanOptions(opts []string) []string {
	out := make([]string, 0, len(opts))
	for _, o := range opts {
		if v := strings.TrimSpace(o); v != "" {
			out = append(out, v)
		}
	}
	return out
}
