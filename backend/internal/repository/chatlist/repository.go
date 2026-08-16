// Package chatlistrepo reads the cross-event chat list — every event the
// caller organizes or participates in, each with its most recent message and
// unread count. Three queries (events, latest messages, unread counts)
// merged in Go, matching the codebase's established pattern for list
// enrichment (see eventrepo.ListForUserEnriched) rather than a single
// LATERAL-joined query.
package chatlistrepo

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"bimeet/internal/model"
	"bimeet/internal/secret"
)

type Repository struct {
	pool   *pgxpool.Pool
	cipher *secret.Cipher
}

func New(pool *pgxpool.Pool, cipher *secret.Cipher) *Repository {
	return &Repository{pool: pool, cipher: cipher}
}

func (r *Repository) ListForUser(ctx context.Context, userID uuid.UUID) ([]model.ChatSummary, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT DISTINCT e.id, e.title, e.date_start IS NULL, e.last_activity_at
		 FROM events e
		 LEFT JOIN event_participants ep ON ep.event_id = e.id AND ep.user_id = $1
		 WHERE e.organizer_id = $1 OR ep.user_id = $1
		 ORDER BY e.last_activity_at DESC`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("list chats: %w", err)
	}

	var summaries []model.ChatSummary
	idxByEvent := make(map[uuid.UUID]int)
	for rows.Next() {
		var s model.ChatSummary
		if err := rows.Scan(&s.EventID, &s.EventTitle, &s.IsPermanent, &s.LastActivityAt); err != nil {
			rows.Close()
			return nil, fmt.Errorf("scan chat summary: %w", err)
		}
		idxByEvent[s.EventID] = len(summaries)
		summaries = append(summaries, s)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(summaries) == 0 {
		return summaries, nil
	}

	eventIDs := make([]uuid.UUID, 0, len(summaries))
	for _, s := range summaries {
		eventIDs = append(eventIDs, s.EventID)
	}

	if err := r.attachLastMessages(ctx, summaries, idxByEvent, eventIDs, userID); err != nil {
		return nil, err
	}
	if err := r.attachUnreadCounts(ctx, summaries, idxByEvent, eventIDs, userID); err != nil {
		return nil, err
	}

	return summaries, nil
}

func (r *Repository) attachLastMessages(ctx context.Context, summaries []model.ChatSummary, idxByEvent map[uuid.UUID]int, eventIDs []uuid.UUID, userID uuid.UUID) error {
	rows, err := r.pool.Query(ctx,
		`SELECT DISTINCT ON (m.event_id) m.event_id, m.user_id, u.name, m.body, m.image_url, m.created_at, m.deleted_at
		 FROM event_messages m
		 JOIN users u ON u.id = m.user_id
		 WHERE m.event_id = ANY($1)
		 ORDER BY m.event_id, m.created_at DESC`,
		eventIDs,
	)
	if err != nil {
		return fmt.Errorf("list last messages: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var (
			eventID   uuid.UUID
			authorID  uuid.UUID
			lm        model.ChatLastMessage
			deletedAt *time.Time
		)
		if err := rows.Scan(&eventID, &authorID, &lm.AuthorName, &lm.Body, &lm.ImageURL, &lm.CreatedAt, &deletedAt); err != nil {
			return fmt.Errorf("scan last message: %w", err)
		}
		lm.IsMine = authorID == userID
		if deletedAt != nil {
			lm.Deleted = true
			lm.Body = ""
			lm.ImageURL = nil
		} else {
			lm.Body = r.cipher.Decrypt(lm.Body)
		}
		if i, ok := idxByEvent[eventID]; ok {
			summaries[i].LastMessage = &lm
		}
	}
	return rows.Err()
}

func (r *Repository) attachUnreadCounts(ctx context.Context, summaries []model.ChatSummary, idxByEvent map[uuid.UUID]int, eventIDs []uuid.UUID, userID uuid.UUID) error {
	rows, err := r.pool.Query(ctx,
		`SELECT m.event_id, count(*)
		 FROM event_messages m
		 LEFT JOIN event_chat_reads r ON r.event_id = m.event_id AND r.user_id = $2
		 WHERE m.event_id = ANY($1) AND m.deleted_at IS NULL AND m.user_id <> $2
		   AND m.created_at > COALESCE(r.last_read_at, 'epoch'::timestamptz)
		 GROUP BY m.event_id`,
		eventIDs, userID,
	)
	if err != nil {
		return fmt.Errorf("count unread per chat: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var eventID uuid.UUID
		var count int
		if err := rows.Scan(&eventID, &count); err != nil {
			return fmt.Errorf("scan unread count: %w", err)
		}
		if i, ok := idxByEvent[eventID]; ok {
			summaries[i].UnreadCount = count
		}
	}
	return rows.Err()
}
