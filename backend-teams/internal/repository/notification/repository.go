package notificationrepo

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"bimeet-teams/internal/model"
)

type Repository struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) Create(ctx context.Context, userID uuid.UUID, eventID *uuid.UUID, typ, message string) (model.Notification, error) {
	row := r.pool.QueryRow(ctx,
		`INSERT INTO notifications (user_id, event_id, type, message) VALUES ($1, $2, $3, $4)
		 RETURNING id, user_id, event_id, type, message, is_read, created_at`,
		userID, eventID, typ, message,
	)
	var n model.Notification
	if err := row.Scan(&n.ID, &n.UserID, &n.EventID, &n.Type, &n.Message, &n.IsRead, &n.CreatedAt); err != nil {
		return model.Notification{}, fmt.Errorf("create notification: %w", err)
	}
	return n, nil
}

func (r *Repository) ListByUser(ctx context.Context, userID uuid.UUID) ([]model.Notification, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, user_id, event_id, type, message, is_read, created_at
		 FROM notifications WHERE user_id=$1 ORDER BY created_at DESC`, userID,
	)
	if err != nil {
		return nil, fmt.Errorf("list notifications: %w", err)
	}
	defer rows.Close()

	out := []model.Notification{}
	for rows.Next() {
		var n model.Notification
		if err := rows.Scan(&n.ID, &n.UserID, &n.EventID, &n.Type, &n.Message, &n.IsRead, &n.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan notification: %w", err)
		}
		out = append(out, n)
	}
	return out, rows.Err()
}

func (r *Repository) MarkRead(ctx context.Context, userID, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2`, id, userID)
	if err != nil {
		return fmt.Errorf("mark read: %w", err)
	}
	return nil
}

func (r *Repository) MarkAllRead(ctx context.Context, userID uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `UPDATE notifications SET is_read=TRUE WHERE user_id=$1 AND is_read=FALSE`, userID)
	if err != nil {
		return fmt.Errorf("mark all read: %w", err)
	}
	return nil
}
