package linksvc

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

type EventAccessor interface {
	GetByID(ctx context.Context, id uuid.UUID) (model.Event, error)
	IsParticipant(ctx context.Context, eventID, userID uuid.UUID) (bool, error)
}

type LinkRepo interface {
	Create(ctx context.Context, eventID, createdBy uuid.UUID, title, url string) (model.LinkInfo, error)
	ListByEvent(ctx context.Context, eventID uuid.UUID) ([]model.LinkInfo, error)
	Delete(ctx context.Context, eventID, linkID, requesterID uuid.UUID, allowAny bool) error
}

type Service struct {
	events EventAccessor
	links  LinkRepo
}

func New(events EventAccessor, links LinkRepo) *Service {
	return &Service{events: events, links: links}
}

func (s *Service) List(ctx context.Context, eventID, companyID, userID uuid.UUID) ([]model.LinkInfo, error) {
	if _, err := s.access(ctx, eventID, companyID, userID); err != nil {
		return nil, err
	}
	return s.links.ListByEvent(ctx, eventID)
}

func (s *Service) Create(ctx context.Context, eventID, companyID, userID uuid.UUID, req model.CreateLinkRequest) (model.LinkInfo, error) {
	if _, err := s.access(ctx, eventID, companyID, userID); err != nil {
		return model.LinkInfo{}, err
	}
	title := strings.TrimSpace(req.Title)
	url := strings.TrimSpace(req.URL)
	if title == "" || url == "" {
		return model.LinkInfo{}, ValidationError{"title and url are required"}
	}
	return s.links.Create(ctx, eventID, userID, title, url)
}

// Delete allows the organizer to remove any link, and a member to remove a link
// they created.
func (s *Service) Delete(ctx context.Context, eventID, companyID, userID, linkID uuid.UUID) error {
	ev, err := s.access(ctx, eventID, companyID, userID)
	if err != nil {
		return err
	}
	isOrganizer := ev.OrganizerID == userID
	if err := s.links.Delete(ctx, eventID, linkID, userID, isOrganizer); err != nil {
		return ValidationError{"link not found"}
	}
	return nil
}

func (s *Service) access(ctx context.Context, eventID, companyID, userID uuid.UUID) (model.Event, error) {
	ev, err := s.events.GetByID(ctx, eventID)
	if err != nil || ev.CompanyID != companyID {
		return model.Event{}, ErrNotFound
	}
	if ev.OrganizerID == userID {
		return ev, nil
	}
	isPart, err := s.events.IsParticipant(ctx, eventID, userID)
	if err != nil {
		return model.Event{}, err
	}
	if !isPart {
		return model.Event{}, ErrForbidden
	}
	return ev, nil
}
