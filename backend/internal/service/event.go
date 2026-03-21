package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"meetup/internal/model"
	"meetup/internal/repository"
)

type EventService struct {
	eventRepo        *repository.EventRepository
	userRepo         *repository.UserRepository
	notificationRepo *repository.NotificationRepository
	pendingRepo      *repository.PendingInvitationRepository
	mailer           *Mailer
}

func NewEventService(
	eventRepo *repository.EventRepository,
	userRepo *repository.UserRepository,
	notificationRepo *repository.NotificationRepository,
	pendingRepo *repository.PendingInvitationRepository,
	mailer *Mailer,
) *EventService {
	return &EventService{
		eventRepo:        eventRepo,
		userRepo:         userRepo,
		notificationRepo: notificationRepo,
		pendingRepo:      pendingRepo,
		mailer:           mailer,
	}
}

func (s *EventService) List(ctx context.Context, userID uuid.UUID) ([]model.EventListItem, error) {
	return s.eventRepo.ListForUserEnriched(ctx, userID)
}

func (s *EventService) Create(ctx context.Context, req model.CreateEventRequest, organizerID uuid.UUID) (model.Event, error) {
	if req.Title == "" {
		return model.Event{}, fmt.Errorf("title is required")
	}
	if req.DateStart.IsZero() || req.DateEnd.IsZero() {
		return model.Event{}, fmt.Errorf("date_start and date_end are required")
	}
	if req.DateEnd.Before(req.DateStart) {
		return model.Event{}, fmt.Errorf("date_end must be after date_start")
	}
	if req.Category == "" {
		req.Category = "ordinary"
	}
	if req.Category != "ordinary" && req.Category != "business" {
		return model.Event{}, fmt.Errorf("category must be ordinary or business")
	}
	return s.eventRepo.Create(ctx, req, organizerID)
}

func (s *EventService) GetByID(ctx context.Context, id, userID uuid.UUID) (model.EventDetail, error) {
	return s.eventRepo.GetDetail(ctx, id, userID)
}

func (s *EventService) GetByInviteToken(ctx context.Context, token uuid.UUID) (model.Event, error) {
	return s.eventRepo.GetByInviteToken(ctx, token)
}

func (s *EventService) JoinByInviteToken(ctx context.Context, token, userID uuid.UUID, req model.JoinByInviteTokenRequest) (model.EventParticipant, error) {
	event, err := s.eventRepo.GetByInviteToken(ctx, token)
	if err != nil {
		return model.EventParticipant{}, fmt.Errorf("event not found")
	}

	if event.OrganizerID == userID {
		return model.EventParticipant{}, fmt.Errorf("you are the organizer of this event")
	}

	action := req.Action
	if action == "" {
		action = "join"
	}

	var status string
	switch action {
	case "join":
		status = "confirmed"
	case "decline":
		status = "declined"
	default:
		return model.EventParticipant{}, fmt.Errorf("action must be join or decline")
	}

	p, err := s.eventRepo.AddParticipant(ctx, event.ID, userID, status)
	if err != nil {
		return model.EventParticipant{}, err
	}
	return p, nil
}

func (s *EventService) Update(ctx context.Context, id, userID uuid.UUID, req model.UpdateEventRequest) (model.Event, error) {
	event, err := s.eventRepo.GetByID(ctx, id)
	if err != nil {
		return model.Event{}, fmt.Errorf("event not found")
	}

	if event.OrganizerID != userID {
		return model.Event{}, fmt.Errorf("forbidden")
	}

	// Record changes in the log
	type fieldChange struct {
		name     string
		oldVal   string
		newVal   string
		changed  bool
	}

	if req.Category != nil && *req.Category != "ordinary" && *req.Category != "business" {
		return model.Event{}, fmt.Errorf("category must be ordinary or business")
	}

	changes := []fieldChange{
		{name: "title", oldVal: event.Title, newVal: func() string {
			if req.Title != nil { return *req.Title }; return event.Title
		}(), changed: req.Title != nil && *req.Title != event.Title},
		{name: "description", oldVal: event.Description, newVal: func() string {
			if req.Description != nil { return *req.Description }; return event.Description
		}(), changed: req.Description != nil && *req.Description != event.Description},
		{name: "location", oldVal: event.Location, newVal: func() string {
			if req.Location != nil { return *req.Location }; return event.Location
		}(), changed: req.Location != nil && *req.Location != event.Location},
		{name: "date_start", oldVal: event.DateStart.String(), newVal: func() string {
			if req.DateStart != nil { return req.DateStart.String() }; return event.DateStart.String()
		}(), changed: req.DateStart != nil && !req.DateStart.Equal(event.DateStart)},
		{name: "date_end", oldVal: event.DateEnd.String(), newVal: func() string {
			if req.DateEnd != nil { return req.DateEnd.String() }; return event.DateEnd.String()
		}(), changed: req.DateEnd != nil && !req.DateEnd.Equal(event.DateEnd)},
		{name: "category", oldVal: event.Category, newVal: func() string {
			if req.Category != nil { return *req.Category }; return event.Category
		}(), changed: req.Category != nil && *req.Category != event.Category},
	}

	updated, err := s.eventRepo.Update(ctx, id, req)
	if err != nil {
		return model.Event{}, err
	}

	for _, ch := range changes {
		if ch.changed {
			_ = s.eventRepo.AddChangeLog(ctx, id, userID, ch.name, ch.oldVal, ch.newVal)
		}
	}

	// Notify all participants about changes
	go func() {
		bgCtx := context.Background()
		participants, err := s.eventRepo.ListParticipants(bgCtx, id)
		if err != nil {
			return
		}
		for _, p := range participants {
			if p.UserID == userID {
				continue
			}
			_, _ = s.notificationRepo.Create(bgCtx, p.UserID, &id, "event_updated",
				fmt.Sprintf("Event '%s' has been updated", updated.Title))
		}
	}()

	return updated, nil
}

func (s *EventService) Delete(ctx context.Context, id, userID uuid.UUID) error {
	event, err := s.eventRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("event not found")
	}
	if event.OrganizerID != userID {
		return fmt.Errorf("forbidden")
	}
	return s.eventRepo.Delete(ctx, id)
}

// ─── Participants ─────────────────────────────────────────────────────────

func (s *EventService) ListPendingInvitations(ctx context.Context, eventID, callerID uuid.UUID) ([]model.PendingInvitation, error) {
	event, err := s.eventRepo.GetByID(ctx, eventID)
	if err != nil {
		return nil, fmt.Errorf("event not found")
	}
	if event.OrganizerID != callerID {
		return nil, fmt.Errorf("forbidden")
	}
	return s.pendingRepo.GetByEvent(ctx, eventID)
}

func (s *EventService) InviteParticipant(ctx context.Context, eventID, organizerID uuid.UUID, req model.InviteParticipantRequest) (model.InviteParticipantResponse, error) {
	event, err := s.eventRepo.GetByID(ctx, eventID)
	if err != nil {
		return model.InviteParticipantResponse{}, fmt.Errorf("event not found")
	}
	if event.OrganizerID != organizerID {
		return model.InviteParticipantResponse{}, fmt.Errorf("forbidden")
	}

	organizer, err := s.userRepo.GetByID(ctx, organizerID)
	if err != nil {
		return model.InviteParticipantResponse{}, fmt.Errorf("organizer not found")
	}

	user, err := s.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		// User not found — create pending invitation and send email
		if pendingErr := s.pendingRepo.Create(ctx, eventID, organizerID, req.Email); pendingErr != nil {
			return model.InviteParticipantResponse{}, fmt.Errorf("failed to create pending invitation: %w", pendingErr)
		}
		go func() {
			_ = s.mailer.SendInvite(req.Email, event.Title, organizer.Name, event.InviteToken.String())
		}()
		return model.InviteParticipantResponse{
			Status:  "pending",
			Message: "invitation sent to email",
		}, nil
	}

	if user.ID == organizerID {
		return model.InviteParticipantResponse{}, fmt.Errorf("cannot invite yourself")
	}

	p, err := s.eventRepo.AddParticipant(ctx, eventID, user.ID, "invited")
	if err != nil {
		return model.InviteParticipantResponse{}, err
	}

	// Create notification for invited user
	go func() {
		_, _ = s.notificationRepo.Create(context.Background(), user.ID, &eventID, "event_invite",
			fmt.Sprintf("You have been invited to event '%s'", event.Title))
	}()

	return model.InviteParticipantResponse{
		Status:      "invited",
		Message:     "user invited",
		Participant: &p,
	}, nil
}

func (s *EventService) UpdateParticipantStatus(ctx context.Context, eventID, targetUserID, callerID uuid.UUID, req model.UpdateParticipantStatusRequest) (model.EventParticipant, error) {
	if req.Status != "confirmed" && req.Status != "declined" {
		return model.EventParticipant{}, fmt.Errorf("status must be confirmed or declined")
	}

	// Users can only update their own status
	if callerID != targetUserID {
		return model.EventParticipant{}, fmt.Errorf("forbidden")
	}

	_, err := s.eventRepo.GetByID(ctx, eventID)
	if err != nil {
		return model.EventParticipant{}, fmt.Errorf("event not found")
	}

	p, err := s.eventRepo.UpdateParticipantStatus(ctx, eventID, targetUserID, req.Status)
	if err != nil {
		if isNotFound(err) {
			return model.EventParticipant{}, fmt.Errorf("participant not found")
		}
		return model.EventParticipant{}, err
	}
	return p, nil
}

func isNotFound(err error) bool {
	return err == pgx.ErrNoRows
}
