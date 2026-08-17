package messagesvc

import (
	"context"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"

	"bimeet/internal/model"
)

const (
	notifTypeChat    = "chat_message"
	notifTypeMention = "chat_mention"
	maxMessageLen    = 4000
	defaultLimit     = 50
	maxLimit         = 100
	// maxEmojiRunes generously covers compound emoji (skin tone modifiers,
	// ZWJ family sequences) while still rejecting arbitrary pasted text.
	maxEmojiRunes = 8
)

// mentionPattern matches @name tokens. Names here are first-name-only (see
// model.User.Name/LastName), so a run of letters/digits/underscore with no
// spaces is enough — no need for the bracket-quoting some chat apps use for
// multi-word names.
var mentionPattern = regexp.MustCompile(`@([\p{L}\p{N}_'-]+)`)

type Service struct {
	repo      MessageRepo
	eventRepo EventRepo
	notifier  Notifier
	uploader  Uploader
	publisher Publisher
}

func New(repo MessageRepo, eventRepo EventRepo, notifier Notifier, uploader Uploader, publisher Publisher) *Service {
	return &Service{repo: repo, eventRepo: eventRepo, notifier: notifier, uploader: uploader, publisher: publisher}
}

// List returns a page of an event's messages, oldest-first within the page.
// With before nil it returns the most recent page; passing the created_at of
// the oldest message already loaded fetches the page before it.
func (s *Service) List(ctx context.Context, eventID, userID uuid.UUID, before *time.Time, limit int) ([]model.Message, error) {
	if err := s.assertParticipant(ctx, eventID, userID); err != nil {
		return nil, err
	}
	if limit <= 0 || limit > maxLimit {
		limit = defaultLimit
	}
	return s.repo.ListByEvent(ctx, eventID, userID, before, limit)
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
		if parent, err := s.repo.GetByID(ctx, *req.ReplyToID, userID); err == nil && parent.EventID == eventID {
			replyToID = req.ReplyToID
		}
	}

	msg, err := s.repo.Create(ctx, eventID, userID, body, replyToID, nil)
	if err != nil {
		return model.Message{}, err
	}

	// Sender is implicitly caught up on their own message.
	_ = s.repo.MarkRead(ctx, eventID, userID)

	s.publisher.PublishMessage(eventID, msg)

	// Notify the other members best-effort, off the request path.
	go s.notifyMembers(eventID, userID, body)

	return msg, nil
}

var allowedImageMIME = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
}

// PostImage stores a chat photo (with an optional caption) from a participant,
// uploading it to object storage before creating the message row.
func (s *Service) PostImage(ctx context.Context, eventID, userID uuid.UUID, caption string, file multipart.File, header *multipart.FileHeader) (model.Message, error) {
	if err := s.assertParticipant(ctx, eventID, userID); err != nil {
		return model.Message{}, err
	}
	caption = strings.TrimSpace(caption)
	if utf8.RuneCountInString(caption) > maxMessageLen {
		return model.Message{}, fmt.Errorf("message is too long")
	}

	var sniff [512]byte
	n, err := io.ReadFull(file, sniff[:])
	if err != nil && !errors.Is(err, io.ErrUnexpectedEOF) && !errors.Is(err, io.EOF) {
		return model.Message{}, fmt.Errorf("read image: %w", err)
	}
	contentType := http.DetectContentType(sniff[:n])
	if idx := strings.IndexByte(contentType, ';'); idx >= 0 {
		contentType = contentType[:idx]
	}
	if !allowedImageMIME[contentType] {
		return model.Message{}, fmt.Errorf("unsupported image type: %s", contentType)
	}
	// Seek back so the S3 client gets the full, seekable file (a MultiReader
	// wrapping the sniffed prefix isn't seekable, which breaks checksum
	// computation over plain HTTP, e.g. local MinIO without TLS).
	if _, err := file.Seek(0, 0); err != nil {
		return model.Message{}, fmt.Errorf("seek file: %w", err)
	}

	key := fmt.Sprintf("chat/%s/%s-%d", eventID, userID, time.Now().UnixMilli())
	imageURL, err := s.uploader.Upload(ctx, key, contentType, file)
	if err != nil {
		return model.Message{}, fmt.Errorf("upload image: %w", err)
	}

	var replyToID *uuid.UUID
	msg, err := s.repo.Create(ctx, eventID, userID, caption, replyToID, &imageURL)
	if err != nil {
		return model.Message{}, err
	}

	_ = s.repo.MarkRead(ctx, eventID, userID)
	s.publisher.PublishMessage(eventID, msg)
	go s.notifyMembers(eventID, userID, caption)

	return msg, nil
}

// Delete soft-deletes a message; allowed for its author or the organizer.
func (s *Service) Delete(ctx context.Context, eventID, messageID, userID uuid.UUID) error {
	msg, err := s.repo.GetByID(ctx, messageID, userID)
	if err != nil {
		return fmt.Errorf("message not found")
	}
	if msg.EventID != eventID {
		return fmt.Errorf("message does not belong to this event")
	}
	if !msg.IsMine {
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
	if err := s.repo.MarkRead(ctx, eventID, userID); err != nil {
		return err
	}
	// Clear the collapsed chat notification too, so its counter restarts fresh on
	// the next message instead of carrying over what the user just read.
	_ = s.notifier.MarkReadByEventAndType(ctx, userID, eventID, notifTypeChat)
	return nil
}

func (s *Service) UnreadCount(ctx context.Context, eventID, userID uuid.UUID) (int, error) {
	if err := s.assertParticipant(ctx, eventID, userID); err != nil {
		return 0, err
	}
	return s.repo.CountUnread(ctx, eventID, userID)
}

// ToggleReaction adds the caller's reaction to a message if absent, removes
// it if present, and pushes the updated message to every live subscriber of
// the event so reaction counts stay in sync without a refetch.
func (s *Service) ToggleReaction(ctx context.Context, eventID, messageID, userID uuid.UUID, emoji string) (model.Message, error) {
	if err := s.assertParticipant(ctx, eventID, userID); err != nil {
		return model.Message{}, err
	}
	emoji = strings.TrimSpace(emoji)
	if emoji == "" {
		return model.Message{}, fmt.Errorf("emoji is required")
	}
	if utf8.RuneCountInString(emoji) > maxEmojiRunes {
		return model.Message{}, fmt.Errorf("not a single emoji")
	}

	msg, err := s.repo.GetByID(ctx, messageID, userID)
	if err != nil {
		return model.Message{}, fmt.Errorf("message not found")
	}
	if msg.EventID != eventID {
		return model.Message{}, fmt.Errorf("message does not belong to this event")
	}

	if _, err := s.repo.ToggleReaction(ctx, messageID, userID, emoji); err != nil {
		return model.Message{}, err
	}

	updated, err := s.repo.GetByID(ctx, messageID, userID)
	if err != nil {
		return model.Message{}, err
	}
	s.publisher.PublishMessage(eventID, updated)
	return updated, nil
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
func (s *Service) notifyMembers(eventID, senderID uuid.UUID, body string) {
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
		// Upsert collapses repeats into one row per (user, event) with a counter,
		// so a chatty event yields a single growing notification, not a flood.
		_, _ = s.notifier.UpsertChatNotification(ctx, uid, eventID, notifTypeChat, message)
	}

	// Mentions get their own notification, never collapsed — losing a @mention
	// in a counter that only shows "5 new messages" would defeat the point.
	if names, err := s.eventRepo.ListMemberNames(ctx, eventID); err == nil {
		mentioned := make(map[uuid.UUID]struct{})
		for _, match := range mentionPattern.FindAllStringSubmatch(body, -1) {
			if uid, ok := names[strings.ToLower(match[1])]; ok && uid != senderID {
				mentioned[uid] = struct{}{}
			}
		}
		mentionMsg := fmt.Sprintf("Вас упомянули в «%s»", event.Title)
		for uid := range mentioned {
			_, _ = s.notifier.Create(ctx, uid, &eventID, notifTypeMention, mentionMsg)
		}
	}

	// The activity ping (unlike the notification above) also goes to the
	// sender — their own /api/chats list needs to re-sort and clear its
	// preview too, just without an unread badge.
	activityRecipients := make([]uuid.UUID, 0, len(recipients)+1)
	activityRecipients = append(activityRecipients, senderID)
	for uid := range recipients {
		activityRecipients = append(activityRecipients, uid)
	}
	s.publisher.PublishActivity(activityRecipients, eventID)
}
