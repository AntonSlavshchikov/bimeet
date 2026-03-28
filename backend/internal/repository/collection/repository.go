package collectionrepo

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"meetup/internal/model"
)

type Repository struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) Create(ctx context.Context, eventID uuid.UUID, req model.CreateCollectionRequest, createdBy uuid.UUID) (model.Collection, error) {
	var c model.Collection
	err := r.pool.QueryRow(ctx,
		`INSERT INTO collections (event_id, title, target_amount, created_by)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, event_id, title, target_amount, created_by, created_at`,
		eventID, req.Title, req.TargetAmount, createdBy,
	).Scan(&c.ID, &c.EventID, &c.Title, &c.TargetAmount, &c.CreatedBy, &c.CreatedAt)
	if err != nil {
		return model.Collection{}, fmt.Errorf("create collection: %w", err)
	}
	return c, nil
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (model.Collection, error) {
	var c model.Collection
	err := r.pool.QueryRow(ctx,
		`SELECT id, event_id, title, target_amount, created_by, created_at FROM collections WHERE id=$1`,
		id,
	).Scan(&c.ID, &c.EventID, &c.Title, &c.TargetAmount, &c.CreatedBy, &c.CreatedAt)
	if err != nil {
		return model.Collection{}, fmt.Errorf("get collection: %w", err)
	}
	return c, nil
}

func (r *Repository) ListByEvent(ctx context.Context, eventID uuid.UUID) ([]model.Collection, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, event_id, title, target_amount, created_by, created_at
		 FROM collections WHERE event_id=$1 ORDER BY created_at`,
		eventID,
	)
	if err != nil {
		return nil, fmt.Errorf("list collections: %w", err)
	}
	defer rows.Close()

	var cols []model.Collection
	for rows.Next() {
		var c model.Collection
		if err := rows.Scan(&c.ID, &c.EventID, &c.Title, &c.TargetAmount, &c.CreatedBy, &c.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan collection: %w", err)
		}
		cols = append(cols, c)
	}
	return cols, rows.Err()
}

func (r *Repository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM collections WHERE id=$1`, id)
	if err != nil {
		return fmt.Errorf("delete collection: %w", err)
	}
	return nil
}

func (r *Repository) GetContribution(ctx context.Context, collectionID, userID uuid.UUID) (model.CollectionContribution, error) {
	var cc model.CollectionContribution
	err := r.pool.QueryRow(ctx,
		`SELECT id, collection_id, user_id, paid, paid_at FROM collection_contributions
		 WHERE collection_id=$1 AND user_id=$2`,
		collectionID, userID,
	).Scan(&cc.ID, &cc.CollectionID, &cc.UserID, &cc.Paid, &cc.PaidAt)
	if err != nil {
		return model.CollectionContribution{}, fmt.Errorf("get contribution: %w", err)
	}
	return cc, nil
}

func (r *Repository) ToggleContribution(ctx context.Context, collectionID, userID uuid.UUID) (model.CollectionContribution, error) {
	var cc model.CollectionContribution
	err := r.pool.QueryRow(ctx,
		`INSERT INTO collection_contributions (collection_id, user_id, paid, paid_at)
		 VALUES ($1, $2, TRUE, NOW())
		 ON CONFLICT (collection_id, user_id) DO UPDATE
		   SET paid = NOT collection_contributions.paid,
		       paid_at = CASE WHEN NOT collection_contributions.paid THEN NOW() ELSE NULL END
		 RETURNING id, collection_id, user_id, paid, paid_at`,
		collectionID, userID,
	).Scan(&cc.ID, &cc.CollectionID, &cc.UserID, &cc.Paid, &cc.PaidAt)
	if err != nil {
		return model.CollectionContribution{}, fmt.Errorf("toggle contribution: %w", err)
	}
	return cc, nil
}

func (r *Repository) ListContributions(ctx context.Context, collectionID uuid.UUID) ([]model.CollectionContribution, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, collection_id, user_id, paid, paid_at FROM collection_contributions
		 WHERE collection_id=$1`,
		collectionID,
	)
	if err != nil {
		return nil, fmt.Errorf("list contributions: %w", err)
	}
	defer rows.Close()

	var contribs []model.CollectionContribution
	for rows.Next() {
		var cc model.CollectionContribution
		if err := rows.Scan(&cc.ID, &cc.CollectionID, &cc.UserID, &cc.Paid, &cc.PaidAt); err != nil {
			return nil, fmt.Errorf("scan contribution: %w", err)
		}
		contribs = append(contribs, cc)
	}
	return contribs, rows.Err()
}

func (r *Repository) CountPaidContributions(ctx context.Context, collectionID uuid.UUID) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM collection_contributions WHERE collection_id=$1 AND paid=TRUE`,
		collectionID,
	).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count paid contributions: %w", err)
	}
	return count, nil
}
