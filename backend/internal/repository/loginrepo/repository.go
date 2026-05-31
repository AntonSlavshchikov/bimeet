package loginrepo

import (
	"context"
	"fmt"
	"time"

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

const loginCodeColumns = `id, email, code_hash, expires_at, attempts, used, created_at`

func scanLoginCode(row interface {
	Scan(...any) error
}) (model.LoginCode, error) {
	var c model.LoginCode
	err := row.Scan(&c.ID, &c.Email, &c.CodeHash, &c.ExpiresAt, &c.Attempts, &c.Used, &c.CreatedAt)
	return c, err
}

// Create stores a new (hashed) login code for an email.
func (r *Repository) Create(ctx context.Context, email, codeHash string, expiresAt time.Time) (model.LoginCode, error) {
	row := r.pool.QueryRow(ctx,
		`INSERT INTO login_codes (email, code_hash, expires_at)
		 VALUES ($1, $2, $3)
		 RETURNING `+loginCodeColumns,
		email, codeHash, expiresAt,
	)
	c, err := scanLoginCode(row)
	if err != nil {
		return model.LoginCode{}, fmt.Errorf("create login code: %w", err)
	}
	return c, nil
}

// GetActiveByEmail returns the most recent unused, non-expired code for an email.
func (r *Repository) GetActiveByEmail(ctx context.Context, email string) (model.LoginCode, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT `+loginCodeColumns+`
		 FROM login_codes
		 WHERE email=$1 AND used=FALSE AND expires_at > NOW()
		 ORDER BY created_at DESC
		 LIMIT 1`,
		email,
	)
	c, err := scanLoginCode(row)
	if err != nil {
		return model.LoginCode{}, fmt.Errorf("get active login code: %w", err)
	}
	return c, nil
}

// IncAttempts increments the failed-attempt counter for a code.
func (r *Repository) IncAttempts(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE login_codes SET attempts = attempts + 1 WHERE id=$1`, id,
	)
	if err != nil {
		return fmt.Errorf("inc login code attempts: %w", err)
	}
	return nil
}

// MarkUsed marks a code as consumed so it cannot be reused.
func (r *Repository) MarkUsed(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE login_codes SET used=TRUE WHERE id=$1`, id,
	)
	if err != nil {
		return fmt.Errorf("mark login code used: %w", err)
	}
	return nil
}

// InvalidateByEmail marks all of an email's active codes as used (called before
// issuing a fresh code, so only one code is ever valid at a time).
func (r *Repository) InvalidateByEmail(ctx context.Context, email string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE login_codes SET used=TRUE WHERE email=$1 AND used=FALSE`, email,
	)
	if err != nil {
		return fmt.Errorf("invalidate login codes: %w", err)
	}
	return nil
}
