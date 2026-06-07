package companyrepo

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

const columns = `id, name, subdomain, brand_color, logo_url, created_at`

func scan(row interface{ Scan(...any) error }) (model.Company, error) {
	var c model.Company
	err := row.Scan(&c.ID, &c.Name, &c.Subdomain, &c.BrandColor, &c.LogoURL, &c.CreatedAt)
	return c, err
}

func (r *Repository) Create(ctx context.Context, name, subdomain string) (model.Company, error) {
	row := r.pool.QueryRow(ctx,
		`INSERT INTO companies (name, subdomain) VALUES ($1, $2) RETURNING `+columns,
		name, subdomain,
	)
	c, err := scan(row)
	if err != nil {
		return model.Company{}, fmt.Errorf("create company: %w", err)
	}
	return c, nil
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (model.Company, error) {
	row := r.pool.QueryRow(ctx, `SELECT `+columns+` FROM companies WHERE id=$1`, id)
	c, err := scan(row)
	if err != nil {
		return model.Company{}, fmt.Errorf("get company by id: %w", err)
	}
	return c, nil
}

func (r *Repository) GetBySubdomain(ctx context.Context, subdomain string) (model.Company, error) {
	row := r.pool.QueryRow(ctx, `SELECT `+columns+` FROM companies WHERE subdomain=$1`, subdomain)
	c, err := scan(row)
	if err != nil {
		return model.Company{}, fmt.Errorf("get company by subdomain: %w", err)
	}
	return c, nil
}

// SubdomainTaken reports whether a company already uses the given subdomain.
func (r *Repository) SubdomainTaken(ctx context.Context, subdomain string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM companies WHERE subdomain=$1)`, subdomain,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("subdomain taken: %w", err)
	}
	return exists, nil
}

func (r *Repository) Update(ctx context.Context, id uuid.UUID, req model.UpdateCompanyRequest) (model.Company, error) {
	row := r.pool.QueryRow(ctx,
		`UPDATE companies SET
		   name        = COALESCE($2, name),
		   brand_color = COALESCE($3, brand_color),
		   logo_url    = COALESCE($4, logo_url)
		 WHERE id=$1
		 RETURNING `+columns,
		id, req.Name, req.BrandColor, req.LogoURL,
	)
	c, err := scan(row)
	if err != nil {
		return model.Company{}, fmt.Errorf("update company: %w", err)
	}
	return c, nil
}
