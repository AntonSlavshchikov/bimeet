package notificationrepo

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"bimeet/internal/model"
)

type Repository struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) Create(ctx context.Context, userID uuid.UUID, eventID *uuid.UUID, notifType, message string) (model.Notification, error) {
	var n model.Notification
	err := r.pool.QueryRow(ctx,
		`INSERT INTO notifications (user_id, event_id, type, message)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, user_id, event_id, type, message, is_read, created_at`,
		userID, eventID, notifType, message,
	).Scan(&n.ID, &n.UserID, &n.EventID, &n.Type, &n.Message, &n.IsRead, &n.CreatedAt)
	if err != nil {
		return model.Notification{}, fmt.Errorf("create notification: %w", err)
	}
	return n, nil
}

func (r *Repository) ListForUser(ctx context.Context, userID uuid.UUID) ([]model.Notification, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, user_id, event_id, type, message, is_read, created_at
		 FROM notifications WHERE user_id=$1 ORDER BY created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("list notifications: %w", err)
	}
	defer rows.Close()

	var notifications []model.Notification
	for rows.Next() {
		var n model.Notification
		if err := rows.Scan(&n.ID, &n.UserID, &n.EventID, &n.Type, &n.Message, &n.IsRead, &n.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan notification: %w", err)
		}
		notifications = append(notifications, n)
	}
	return notifications, rows.Err()
}

func (r *Repository) CountUnread(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT count(*) FROM notifications WHERE user_id=$1 AND is_read=FALSE`,
		userID,
	).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count unread notifications: %w", err)
	}
	return count, nil
}

// HasUnreadByTypeAndEvent reports whether the user already has an unread
// notification of the given type for the event. Used to collapse repeated chat
// notifications into a single "new messages" hint instead of spamming.
func (r *Repository) HasUnreadByTypeAndEvent(ctx context.Context, userID, eventID uuid.UUID, notifType string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		`SELECT EXISTS(
			SELECT 1 FROM notifications
			WHERE user_id=$1 AND event_id=$2 AND type=$3 AND is_read=FALSE
		)`,
		userID, eventID, notifType,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("has unread by type and event: %w", err)
	}
	return exists, nil
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (model.Notification, error) {
	var n model.Notification
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, event_id, type, message, is_read, created_at FROM notifications WHERE id=$1`,
		id,
	).Scan(&n.ID, &n.UserID, &n.EventID, &n.Type, &n.Message, &n.IsRead, &n.CreatedAt)
	if err != nil {
		return model.Notification{}, fmt.Errorf("get notification: %w", err)
	}
	return n, nil
}

func (r *Repository) MarkRead(ctx context.Context, id uuid.UUID) (model.Notification, error) {
	var n model.Notification
	err := r.pool.QueryRow(ctx,
		`UPDATE notifications SET is_read=TRUE WHERE id=$1
		 RETURNING id, user_id, event_id, type, message, is_read, created_at`,
		id,
	).Scan(&n.ID, &n.UserID, &n.EventID, &n.Type, &n.Message, &n.IsRead, &n.CreatedAt)
	if err != nil {
		return model.Notification{}, fmt.Errorf("mark notification read: %w", err)
	}
	return n, nil
}

func (r *Repository) MarkAllRead(ctx context.Context, userID uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE notifications SET is_read=TRUE WHERE user_id=$1`,
		userID,
	)
	if err != nil {
		return fmt.Errorf("mark all notifications read: %w", err)
	}
	return nil
}

func (r *Repository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM notifications WHERE id=$1`, id)
	if err != nil {
		return fmt.Errorf("delete notification: %w", err)
	}
	return nil
}

func (r *Repository) DeleteAll(ctx context.Context, userID uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM notifications WHERE user_id=$1`, userID)
	if err != nil {
		return fmt.Errorf("delete all notifications: %w", err)
	}
	return nil
}
