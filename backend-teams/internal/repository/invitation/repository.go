package invitationrepo

import (
	"context"
	"fmt"
	"time"

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

func (r *Repository) Create(ctx context.Context, companyID uuid.UUID, email, tokenHash string, invitedBy uuid.UUID, expiresAt time.Time) (model.Invitation, error) {
	row := r.pool.QueryRow(ctx,
		`INSERT INTO invitations (company_id, email, token_hash, invited_by, expires_at)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, company_id, email, invited_by, accepted_at, expires_at, created_at`,
		companyID, email, tokenHash, invitedBy, expiresAt,
	)
	var inv model.Invitation
	err := row.Scan(&inv.ID, &inv.CompanyID, &inv.Email, &inv.InvitedBy, &inv.AcceptedAt, &inv.ExpiresAt, &inv.CreatedAt)
	if err != nil {
		return model.Invitation{}, fmt.Errorf("create invitation: %w", err)
	}
	return inv, nil
}

// GetActiveByTokenHash returns an invitation that is unaccepted and unexpired.
func (r *Repository) GetActiveByTokenHash(ctx context.Context, tokenHash string) (model.Invitation, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT id, company_id, email, invited_by, accepted_at, expires_at, created_at
		 FROM invitations
		 WHERE token_hash=$1 AND accepted_at IS NULL AND expires_at > NOW()`,
		tokenHash,
	)
	var inv model.Invitation
	err := row.Scan(&inv.ID, &inv.CompanyID, &inv.Email, &inv.InvitedBy, &inv.AcceptedAt, &inv.ExpiresAt, &inv.CreatedAt)
	if err != nil {
		return model.Invitation{}, fmt.Errorf("get active invitation: %w", err)
	}
	return inv, nil
}

func (r *Repository) MarkAccepted(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `UPDATE invitations SET accepted_at=NOW() WHERE id=$1`, id)
	if err != nil {
		return fmt.Errorf("mark invitation accepted: %w", err)
	}
	return nil
}
