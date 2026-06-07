package eventsvc

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"bimeet-teams/internal/model"
)

var (
	ErrNotFound  = errors.New("event not found")
	ErrForbidden = errors.New("forbidden")
)

// ValidationError is a client-facing 400 with a human-readable message.
type ValidationError struct{ Msg string }

func (e ValidationError) Error() string { return e.Msg }

type EventRepo interface {
	Create(ctx context.Context, companyID, organizerID uuid.UUID, req model.CreateEventRequest) (model.Event, error)
	GetByID(ctx context.Context, id uuid.UUID) (model.Event, error)
	GetDetail(ctx context.Context, eventID uuid.UUID) (model.EventDetail, error)
	ListForUser(ctx context.Context, companyID, userID uuid.UUID) ([]model.EventListItem, error)
	Update(ctx context.Context, id uuid.UUID, req model.UpdateEventRequest) (model.Event, error)
	Delete(ctx context.Context, id uuid.UUID) error
	Complete(ctx context.Context, id uuid.UUID) error
	AddParticipant(ctx context.Context, eventID, userID uuid.UUID) (bool, error)
	UpdateParticipantStatus(ctx context.Context, eventID, userID uuid.UUID, status string) error
	IsParticipant(ctx context.Context, eventID, userID uuid.UUID) (bool, error)
	ParticipantUserIDs(ctx context.Context, eventID uuid.UUID) ([]uuid.UUID, error)
	AddChangeLog(ctx context.Context, eventID, changedBy uuid.UUID, field, oldVal, newVal string) error
}

type UserRepo interface {
	GetByID(ctx context.Context, id uuid.UUID) (model.User, error)
	GetByCompanyAndEmail(ctx context.Context, companyID uuid.UUID, email string) (model.User, string, error)
}

type NotificationRepo interface {
	Create(ctx context.Context, userID uuid.UUID, eventID *uuid.UUID, typ, message string) (model.Notification, error)
}

type Service struct {
	eventRepo  EventRepo
	userRepo   UserRepo
	notifyRepo NotificationRepo
}

func New(eventRepo EventRepo, userRepo UserRepo, notifyRepo NotificationRepo) *Service {
	return &Service{eventRepo: eventRepo, userRepo: userRepo, notifyRepo: notifyRepo}
}

func (s *Service) Create(ctx context.Context, companyID, organizerID uuid.UUID, req model.CreateEventRequest) (model.Event, error) {
	if strings.TrimSpace(req.Title) == "" {
		return model.Event{}, ValidationError{"title is required"}
	}
	if req.DateStart.IsZero() || req.DateEnd.IsZero() {
		return model.Event{}, ValidationError{"date_start and date_end are required"}
	}
	if req.DateEnd.Before(req.DateStart) {
		return model.Event{}, ValidationError{"date_end must be after date_start"}
	}
	if strings.TrimSpace(req.Location) == "" && strings.TrimSpace(req.MeetingURL) == "" {
		return model.Event{}, ValidationError{"either location or meeting_url is required"}
	}
	return s.eventRepo.Create(ctx, companyID, organizerID, req)
}

func (s *Service) List(ctx context.Context, companyID, userID uuid.UUID) ([]model.EventListItem, error) {
	return s.eventRepo.ListForUser(ctx, companyID, userID)
}

// GetDetail returns the enriched event after verifying the caller's company and
// that they are the organizer or a participant.
func (s *Service) GetDetail(ctx context.Context, eventID, companyID, userID uuid.UUID) (model.EventDetail, error) {
	ev, err := s.loadInCompany(ctx, eventID, companyID)
	if err != nil {
		return model.EventDetail{}, err
	}
	if ev.OrganizerID != userID {
		isPart, err := s.eventRepo.IsParticipant(ctx, eventID, userID)
		if err != nil {
			return model.EventDetail{}, err
		}
		if !isPart {
			return model.EventDetail{}, ErrForbidden
		}
	}
	return s.eventRepo.GetDetail(ctx, eventID)
}

func (s *Service) Update(ctx context.Context, eventID, companyID, userID uuid.UUID, req model.UpdateEventRequest) (model.Event, error) {
	ev, err := s.requireOrganizer(ctx, eventID, companyID, userID)
	if err != nil {
		return model.Event{}, err
	}
	if req.DateStart != nil && req.DateEnd != nil && req.DateEnd.Before(*req.DateStart) {
		return model.Event{}, ValidationError{"date_end must be after date_start"}
	}

	changes := collectChanges(ev, req)

	updated, err := s.eventRepo.Update(ctx, eventID, req)
	if err != nil {
		return model.Event{}, err
	}
	for _, c := range changes {
		_ = s.eventRepo.AddChangeLog(ctx, eventID, userID, c.field, c.oldVal, c.newVal)
	}
	s.notifyParticipants(ctx, eventID, userID, "event_updated", fmt.Sprintf("Встреча «%s» обновлена", updated.Title))
	return updated, nil
}

func (s *Service) Delete(ctx context.Context, eventID, companyID, userID uuid.UUID) error {
	if _, err := s.requireOrganizer(ctx, eventID, companyID, userID); err != nil {
		return err
	}
	return s.eventRepo.Delete(ctx, eventID)
}

func (s *Service) Complete(ctx context.Context, eventID, companyID, userID uuid.UUID) error {
	ev, err := s.requireOrganizer(ctx, eventID, companyID, userID)
	if err != nil {
		return err
	}
	if err := s.eventRepo.Complete(ctx, eventID); err != nil {
		return err
	}
	s.notifyParticipants(ctx, eventID, userID, "event_completed", fmt.Sprintf("Встреча «%s» завершена", ev.Title))
	return nil
}

// InviteParticipant invites a colleague (must be a user in the same company).
func (s *Service) InviteParticipant(ctx context.Context, eventID, companyID, organizerID uuid.UUID, email string) error {
	ev, err := s.requireOrganizer(ctx, eventID, companyID, organizerID)
	if err != nil {
		return err
	}
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return ValidationError{"email is required"}
	}

	invitee, _, err := s.userRepo.GetByCompanyAndEmail(ctx, companyID, email)
	if err != nil {
		// Closed perimeter: you can only invite existing company members.
		return ValidationError{"no such user in this company"}
	}

	created, err := s.eventRepo.AddParticipant(ctx, eventID, invitee.ID)
	if err != nil {
		return err
	}
	if created {
		_, _ = s.notifyRepo.Create(ctx, invitee.ID, &eventID, "event_invite",
			fmt.Sprintf("Вас пригласили на встречу «%s»", ev.Title))
	}
	return nil
}

func (s *Service) UpdateParticipantStatus(ctx context.Context, eventID, companyID, userID uuid.UUID, status string) error {
	if status != "confirmed" && status != "declined" {
		return ValidationError{"status must be confirmed or declined"}
	}
	ev, err := s.loadInCompany(ctx, eventID, companyID)
	if err != nil {
		return err
	}
	if err := s.eventRepo.UpdateParticipantStatus(ctx, eventID, userID, status); err != nil {
		return ErrForbidden
	}
	// Tell the organizer about the RSVP (unless they changed their own status).
	if ev.OrganizerID != userID {
		if actor, err := s.userRepo.GetByID(ctx, userID); err == nil {
			verb := "подтвердил(а) участие"
			if status == "declined" {
				verb = "отказался(ась)"
			}
			_, _ = s.notifyRepo.Create(ctx, ev.OrganizerID, &eventID, "rsvp",
				fmt.Sprintf("%s %s во встрече «%s»", actor.Name, verb, ev.Title))
		}
	}
	return nil
}

// ─── helpers ───────────────────────────────────────────────────────────────

// loadInCompany fetches an event and enforces that it belongs to companyID.
// A mismatch is reported as not-found so cross-company ids are indistinguishable.
func (s *Service) loadInCompany(ctx context.Context, eventID, companyID uuid.UUID) (model.Event, error) {
	ev, err := s.eventRepo.GetByID(ctx, eventID)
	if err != nil {
		return model.Event{}, ErrNotFound
	}
	if ev.CompanyID != companyID {
		return model.Event{}, ErrNotFound
	}
	return ev, nil
}

func (s *Service) requireOrganizer(ctx context.Context, eventID, companyID, userID uuid.UUID) (model.Event, error) {
	ev, err := s.loadInCompany(ctx, eventID, companyID)
	if err != nil {
		return model.Event{}, err
	}
	if ev.OrganizerID != userID {
		return model.Event{}, ErrForbidden
	}
	return ev, nil
}

func (s *Service) notifyParticipants(ctx context.Context, eventID, actorID uuid.UUID, typ, message string) {
	ids, err := s.eventRepo.ParticipantUserIDs(ctx, eventID)
	if err != nil {
		return
	}
	for _, id := range ids {
		if id == actorID {
			continue
		}
		_, _ = s.notifyRepo.Create(ctx, id, &eventID, typ, message)
	}
}

type fieldChange struct{ field, oldVal, newVal string }

func collectChanges(ev model.Event, req model.UpdateEventRequest) []fieldChange {
	var out []fieldChange
	if req.Title != nil && *req.Title != ev.Title {
		out = append(out, fieldChange{"title", ev.Title, *req.Title})
	}
	if req.Description != nil && *req.Description != ev.Description {
		out = append(out, fieldChange{"description", ev.Description, *req.Description})
	}
	if req.Location != nil && *req.Location != ev.Location {
		out = append(out, fieldChange{"location", ev.Location, *req.Location})
	}
	if req.MeetingURL != nil && *req.MeetingURL != ev.MeetingURL {
		out = append(out, fieldChange{"meeting_url", ev.MeetingURL, *req.MeetingURL})
	}
	if req.DateStart != nil && !req.DateStart.Equal(ev.DateStart) {
		out = append(out, fieldChange{"date_start", ev.DateStart.String(), req.DateStart.String()})
	}
	if req.DateEnd != nil && !req.DateEnd.Equal(ev.DateEnd) {
		out = append(out, fieldChange{"date_end", ev.DateEnd.String(), req.DateEnd.String()})
	}
	return out
}
