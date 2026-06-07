package userrepo

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

const columns = `id, company_id, email, name, role, is_active, created_at`

func scan(row interface{ Scan(...any) error }) (model.User, error) {
	var u model.User
	err := row.Scan(&u.ID, &u.CompanyID, &u.Email, &u.Name, &u.Role, &u.IsActive, &u.CreatedAt)
	return u, err
}

// Create inserts a user. role must be "owner" or "member".
func (r *Repository) Create(ctx context.Context, companyID uuid.UUID, email, name, passwordHash, role string) (model.User, error) {
	row := r.pool.QueryRow(ctx,
		`INSERT INTO users (company_id, email, name, password_hash, role)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING `+columns,
		companyID, email, name, passwordHash, role,
	)
	u, err := scan(row)
	if err != nil {
		return model.User{}, fmt.Errorf("create user: %w", err)
	}
	return u, nil
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (model.User, error) {
	row := r.pool.QueryRow(ctx, `SELECT `+columns+` FROM users WHERE id=$1`, id)
	u, err := scan(row)
	if err != nil {
		return model.User{}, fmt.Errorf("get user by id: %w", err)
	}
	return u, nil
}

// GetByCompanyAndEmail also returns the stored password hash for login checks.
func (r *Repository) GetByCompanyAndEmail(ctx context.Context, companyID uuid.UUID, email string) (model.User, string, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT `+columns+`, password_hash FROM users WHERE company_id=$1 AND email=$2`,
		companyID, email,
	)
	var u model.User
	var hash string
	err := row.Scan(&u.ID, &u.CompanyID, &u.Email, &u.Name, &u.Role, &u.IsActive, &u.CreatedAt, &hash)
	if err != nil {
		return model.User{}, "", fmt.Errorf("get user by company and email: %w", err)
	}
	return u, hash, nil
}

func (r *Repository) ExistsByCompanyAndEmail(ctx context.Context, companyID uuid.UUID, email string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM users WHERE company_id=$1 AND email=$2)`,
		companyID, email,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("user exists: %w", err)
	}
	return exists, nil
}

func (r *Repository) ListByCompany(ctx context.Context, companyID uuid.UUID) ([]model.User, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+columns+` FROM users WHERE company_id=$1 ORDER BY created_at`, companyID,
	)
	if err != nil {
		return nil, fmt.Errorf("list users: %w", err)
	}
	defer rows.Close()

	users := []model.User{}
	for rows.Next() {
		u, err := scan(rows)
		if err != nil {
			return nil, fmt.Errorf("scan user: %w", err)
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

// SetActive enables/disables a member account within a company.
func (r *Repository) SetActive(ctx context.Context, companyID, userID uuid.UUID, active bool) (model.User, error) {
	row := r.pool.QueryRow(ctx,
		`UPDATE users SET is_active=$3 WHERE company_id=$1 AND id=$2 RETURNING `+columns,
		companyID, userID, active,
	)
	u, err := scan(row)
	if err != nil {
		return model.User{}, fmt.Errorf("set active: %w", err)
	}
	return u, nil
}
