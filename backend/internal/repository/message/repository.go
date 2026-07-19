package messagerepo

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

const selectCols = `m.id, m.event_id, m.user_id, u.name, u.email, m.body, m.image_url, m.created_at, m.deleted_at,
	r.id, ru.name, r.body, r.deleted_at`

const fromJoins = `FROM event_messages m
	JOIN users u ON u.id = m.user_id
	LEFT JOIN event_messages r ON r.id = m.reply_to_id
	LEFT JOIN users ru ON ru.id = r.user_id`

// scanRow maps a joined event_messages/users row (plus the optional replied-to
// message) into a model.Message, decrypting bodies and blanking soft-deleted ones.
// The author's real ID is not exposed; IsMine is set when the caller authored it.
func (r *Repository) scanRow(row interface{ Scan(...any) error }, userID uuid.UUID) (model.Message, error) {
	var (
		m              model.Message
		authorID       uuid.UUID
		deletedAt      *time.Time
		replyID        *uuid.UUID
		replyAuthor    *string
		replyBody      *string
		replyDeletedAt *time.Time
	)
	if err := row.Scan(
		&m.ID, &m.EventID, &authorID, &m.Author.Name, &m.Author.Email, &m.Body, &m.ImageURL, &m.CreatedAt, &deletedAt,
		&replyID, &replyAuthor, &replyBody, &replyDeletedAt,
	); err != nil {
		return model.Message{}, err
	}
	m.IsMine = authorID == userID
	m.Author.IsMe = m.IsMine
	if deletedAt != nil {
		m.Deleted = true
		m.Body = ""
		m.ImageURL = nil
	} else {
		m.Body = r.cipher.Decrypt(m.Body)
	}
	if replyID != nil {
		rp := model.ReplyPreview{ID: *replyID}
		if replyAuthor != nil {
			rp.AuthorName = *replyAuthor
		}
		if replyDeletedAt != nil {
			rp.Deleted = true
		} else if replyBody != nil {
			rp.Body = r.cipher.Decrypt(*replyBody)
		}
		m.ReplyTo = &rp
	}
	return m, nil
}

func (r *Repository) Create(ctx context.Context, eventID, userID uuid.UUID, body string, replyToID *uuid.UUID, imageURL *string) (model.Message, error) {
	var id uuid.UUID
	err := r.pool.QueryRow(ctx,
		`INSERT INTO event_messages (event_id, user_id, body, reply_to_id, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
		eventID, userID, r.cipher.Encrypt(body), replyToID, imageURL,
	).Scan(&id)
	if err != nil {
		return model.Message{}, fmt.Errorf("insert message: %w", err)
	}
	return r.GetByID(ctx, id, userID)
}

func (r *Repository) GetByID(ctx context.Context, id, userID uuid.UUID) (model.Message, error) {
	row := r.pool.QueryRow(ctx, `SELECT `+selectCols+`
		`+fromJoins+`
		WHERE m.id=$1`, id)
	m, err := r.scanRow(row, userID)
	if err != nil {
		return model.Message{}, fmt.Errorf("get message: %w", err)
	}
	return m, nil
}

// ListByEvent returns up to limit most-recent messages older than `before`
// (or now when nil), already ordered oldest→newest for direct display.
func (r *Repository) ListByEvent(ctx context.Context, eventID, userID uuid.UUID, before *time.Time, limit int) ([]model.Message, error) {
	rows, err := r.pool.Query(ctx, `SELECT `+selectCols+`
		`+fromJoins+`
		WHERE m.event_id=$1 AND ($2::timestamptz IS NULL OR m.created_at < $2)
		ORDER BY m.created_at DESC
		LIMIT $3`, eventID, before, limit)
	if err != nil {
		return nil, fmt.Errorf("list messages: %w", err)
	}
	defer rows.Close()

	var msgs []model.Message
	for rows.Next() {
		m, err := r.scanRow(rows, userID)
		if err != nil {
			return nil, fmt.Errorf("scan message: %w", err)
		}
		msgs = append(msgs, m)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	// Reverse to ascending (oldest first) for the chat view.
	for i, j := 0, len(msgs)-1; i < j; i, j = i+1, j-1 {
		msgs[i], msgs[j] = msgs[j], msgs[i]
	}
	return msgs, nil
}

func (r *Repository) SoftDelete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE event_messages SET deleted_at = NOW() WHERE id=$1 AND deleted_at IS NULL`,
		id,
	)
	if err != nil {
		return fmt.Errorf("soft-delete message: %w", err)
	}
	return nil
}

func (r *Repository) MarkRead(ctx context.Context, eventID, userID uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO event_chat_reads (event_id, user_id, last_read_at)
		 VALUES ($1, $2, NOW())
		 ON CONFLICT (event_id, user_id) DO UPDATE SET last_read_at = NOW()`,
		eventID, userID,
	)
	if err != nil {
		return fmt.Errorf("mark chat read: %w", err)
	}
	return nil
}

// CountUnread counts visible messages from other users newer than the caller's
// last-read marker (epoch when they have never opened the chat).
func (r *Repository) CountUnread(ctx context.Context, eventID, userID uuid.UUID) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT count(*) FROM event_messages m
		 WHERE m.event_id=$1 AND m.deleted_at IS NULL AND m.user_id <> $2
		   AND m.created_at > COALESCE(
		       (SELECT last_read_at FROM event_chat_reads WHERE event_id=$1 AND user_id=$2),
		       'epoch'::timestamptz)`,
		eventID, userID,
	).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count unread messages: %w", err)
	}
	return count, nil
}
