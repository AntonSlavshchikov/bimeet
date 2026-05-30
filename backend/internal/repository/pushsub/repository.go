package pushsubrepo

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

// Upsert stores a push subscription, keyed by its unique endpoint. If the same
// endpoint re-subscribes (possibly as a different user), keys and owner refresh.
func (r *Repository) Upsert(ctx context.Context, userID uuid.UUID, endpoint, p256dh, auth, userAgent string) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
		 VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT (endpoint) DO UPDATE
		 SET user_id = EXCLUDED.user_id,
		     p256dh  = EXCLUDED.p256dh,
		     auth    = EXCLUDED.auth,
		     user_agent = EXCLUDED.user_agent`,
		userID, endpoint, p256dh, auth, userAgent,
	)
	if err != nil {
		return fmt.Errorf("upsert push subscription: %w", err)
	}
	return nil
}

func (r *Repository) ListByUser(ctx context.Context, userID uuid.UUID) ([]model.PushSubscription, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, user_id, endpoint, p256dh, auth, COALESCE(user_agent, ''), created_at
		 FROM push_subscriptions WHERE user_id = $1`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("list push subscriptions: %w", err)
	}
	defer rows.Close()

	var subs []model.PushSubscription
	for rows.Next() {
		var s model.PushSubscription
		if err := rows.Scan(&s.ID, &s.UserID, &s.Endpoint, &s.P256dh, &s.Auth, &s.UserAgent, &s.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan push subscription: %w", err)
		}
		subs = append(subs, s)
	}
	return subs, rows.Err()
}

func (r *Repository) DeleteByEndpoint(ctx context.Context, endpoint string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM push_subscriptions WHERE endpoint = $1`, endpoint)
	if err != nil {
		return fmt.Errorf("delete push subscription: %w", err)
	}
	return nil
}
