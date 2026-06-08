package messagesvc

import (
	"context"
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/google/uuid"

	"bimeet/internal/model"
)

const (
	notifTypeChat = "chat_message"
	maxMessageLen = 4000
	defaultLimit  = 50
	maxLimit      = 100
)

type Service struct {
	repo        MessageRepo
	eventRepo   EventRepo
	notifier    Notifier
	notifReader NotifReader
}

func New(repo MessageRepo, eventRepo EventRepo, notifier Notifier, notifReader NotifReader) *Service {
	return &Service{repo: repo, eventRepo: eventRepo, notifier: notifier, notifReader: notifReader}
}

// List returns the most recent messages of an event for a participant.
func (s *Service) List(ctx context.Context, eventID, userID uuid.UUID, limit int) ([]model.Message, error) {
	if err := s.assertParticipant(ctx, eventID, userID); err != nil {
		return nil, err
	}
	if limit <= 0 || limit > maxLimit {
		limit = defaultLimit
	}
	return s.repo.ListByEvent(ctx, eventID, nil, limit)
}

// Post stores a message from a participant and fans out notifications.
func (s *Service) Post(ctx context.Context, eventID, userID uuid.UUID, req model.PostMessageRequest) (model.Message, error) {
	if err := s.assertParticipant(ctx, eventID, userID); err != nil {
		return model.Message{}, err
	}
	body := strings.TrimSpace(req.Body)
	if body == "" {
		return model.Message{}, fmt.Errorf("message body is required")
	}
	if utf8.RuneCountInString(body) > maxMessageLen {
		return model.Message{}, fmt.Errorf("message is too long")
	}

	// A reply must point to a message in the same event; an invalid target is
	// silently ignored (the message is posted without a reply).
	var replyToID *uuid.UUID
	if req.ReplyToID != nil {
		if parent, err := s.repo.GetByID(ctx, *req.ReplyToID); err == nil && parent.EventID == eventID {
			replyToID = req.ReplyToID
		}
	}

	msg, err := s.repo.Create(ctx, eventID, userID, body, replyToID)
	if err != nil {
		return model.Message{}, err
	}

	// Sender is implicitly caught up on their own message.
	_ = s.repo.MarkRead(ctx, eventID, userID)

	// Notify the other members best-effort, off the request path.
	go s.notifyMembers(eventID, userID)

	return msg, nil
}

// Delete soft-deletes a message; allowed for its author or the organizer.
func (s *Service) Delete(ctx context.Context, eventID, messageID, userID uuid.UUID) error {
	msg, err := s.repo.GetByID(ctx, messageID)
	if err != nil {
		return fmt.Errorf("message not found")
	}
	if msg.EventID != eventID {
		return fmt.Errorf("message does not belong to this event")
	}
	if msg.Author.ID != userID {
		event, err := s.eventRepo.GetByID(ctx, eventID)
		if err != nil {
			return fmt.Errorf("event not found")
		}
		if event.OrganizerID != userID {
			return fmt.Errorf("forbidden")
		}
	}
	return s.repo.SoftDelete(ctx, messageID)
}

func (s *Service) MarkRead(ctx context.Context, eventID, userID uuid.UUID) error {
	if err := s.assertParticipant(ctx, eventID, userID); err != nil {
		return err
	}
	return s.repo.MarkRead(ctx, eventID, userID)
}

func (s *Service) UnreadCount(ctx context.Context, eventID, userID uuid.UUID) (int, error) {
	if err := s.assertParticipant(ctx, eventID, userID); err != nil {
		return 0, err
	}
	return s.repo.CountUnread(ctx, eventID, userID)
}

func (s *Service) assertParticipant(ctx context.Context, eventID, userID uuid.UUID) error {
	ok, err := s.eventRepo.IsParticipant(ctx, eventID, userID)
	if err != nil {
		return err
	}
	if !ok {
		return fmt.Errorf("forbidden")
	}
	return nil
}

// notifyMembers creates a notification for every member (organizer + participants,
// excluding declined and the sender), collapsing when an unread chat hint already
// exists. Best-effort: runs in its own context/goroutine.
func (s *Service) notifyMembers(eventID, senderID uuid.UUID) {
	ctx := context.Background()
	event, err := s.eventRepo.GetByID(ctx, eventID)
	if err != nil {
		return
	}
	parts, err := s.eventRepo.ListParticipants(ctx, eventID)
	if err != nil {
		return
	}

	recipients := make(map[uuid.UUID]struct{})
	if event.OrganizerID != senderID {
		recipients[event.OrganizerID] = struct{}{}
	}
	for _, p := range parts {
		if p.UserID == senderID || p.Status == "declined" {
			continue
		}
		recipients[p.UserID] = struct{}{}
	}

	message := fmt.Sprintf("Новое сообщение в «%s»", event.Title)
	for uid := range recipients {
		if has, err := s.notifReader.HasUnreadByTypeAndEvent(ctx, uid, eventID, notifTypeChat); err == nil && has {
			continue // collapse: they already have an unread chat hint
		}
		_, _ = s.notifier.Create(ctx, uid, &eventID, notifTypeChat, message)
	}
}
