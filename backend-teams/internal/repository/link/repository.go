package linkrepo

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

func (r *Repository) Create(ctx context.Context, eventID, createdBy uuid.UUID, title, url string) (model.LinkInfo, error) {
	row := r.pool.QueryRow(ctx,
		`INSERT INTO event_links (event_id, title, url, created_by) VALUES ($1, $2, $3, $4)
		 RETURNING id, title, url, created_by, created_at`,
		eventID, title, url, createdBy,
	)
	var l model.LinkInfo
	if err := row.Scan(&l.ID, &l.Title, &l.URL, &l.CreatedBy, &l.CreatedAt); err != nil {
		return model.LinkInfo{}, fmt.Errorf("create link: %w", err)
	}
	return l, nil
}

func (r *Repository) ListByEvent(ctx context.Context, eventID uuid.UUID) ([]model.LinkInfo, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, title, url, created_by, created_at FROM event_links WHERE event_id=$1 ORDER BY created_at`,
		eventID,
	)
	if err != nil {
		return nil, fmt.Errorf("list links: %w", err)
	}
	defer rows.Close()

	out := []model.LinkInfo{}
	for rows.Next() {
		var l model.LinkInfo
		if err := rows.Scan(&l.ID, &l.Title, &l.URL, &l.CreatedBy, &l.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan link: %w", err)
		}
		out = append(out, l)
	}
	return out, rows.Err()
}

// Delete removes a link scoped to its event. allowAny lets the organizer delete
// any link; otherwise only the link's creator (requesterID) may remove it.
func (r *Repository) Delete(ctx context.Context, eventID, linkID, requesterID uuid.UUID, allowAny bool) error {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM event_links WHERE id=$1 AND event_id=$2 AND ($4 OR created_by=$3)`,
		linkID, eventID, requesterID, allowAny,
	)
	if err != nil {
		return fmt.Errorf("delete link: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("link not found")
	}
	return nil
}
