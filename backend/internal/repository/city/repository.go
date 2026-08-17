package cityrepo

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

func (r *Repository) ListActive(ctx context.Context) ([]model.City, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, region
		 FROM cities
		 WHERE is_active = TRUE
		 ORDER BY name, region`,
	)
	if err != nil {
		return nil, fmt.Errorf("list active cities: %w", err)
	}
	defer rows.Close()

	var cities []model.City
	for rows.Next() {
		var city model.City
		if err := rows.Scan(&city.ID, &city.Name, &city.Region); err != nil {
			return nil, fmt.Errorf("scan city: %w", err)
		}
		cities = append(cities, city)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate active cities: %w", err)
	}
	return cities, nil
}

func (r *Repository) ExistsActive(ctx context.Context, id uuid.UUID) (bool, error) {
	var exists bool
	if err := r.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM cities WHERE id = $1 AND is_active = TRUE)`,
		id,
	).Scan(&exists); err != nil {
		return false, fmt.Errorf("check active city: %w", err)
	}
	return exists, nil
}
