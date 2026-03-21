package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"meetup/internal/model"
)

type PendingInvitationRepository struct {
	pool *pgxpool.Pool
}

func NewPendingInvitationRepository(pool *pgxpool.Pool) *PendingInvitationRepository {
	return &PendingInvitationRepository{pool: pool}
}

func (r *PendingInvitationRepository) Create(ctx context.Context, eventID, invitedBy uuid.UUID, email string) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO pending_invitations (event_id, email, invited_by)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (event_id, email) DO NOTHING`,
		eventID, email, invitedBy,
	)
	return err
}

func (r *PendingInvitationRepository) GetByEmail(ctx context.Context, email string) ([]model.PendingInvitation, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, event_id, email, invited_by, created_at
		 FROM pending_invitations WHERE email = $1`,
		email,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []model.PendingInvitation
	for rows.Next() {
		var p model.PendingInvitation
		if err := rows.Scan(&p.ID, &p.EventID, &p.Email, &p.InvitedBy, &p.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, p)
	}
	return result, rows.Err()
}

func (r *PendingInvitationRepository) DeleteByEmail(ctx context.Context, email string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM pending_invitations WHERE email = $1`, email)
	return err
}

func (r *PendingInvitationRepository) GetByEvent(ctx context.Context, eventID uuid.UUID) ([]model.PendingInvitation, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, event_id, email, invited_by, created_at
		 FROM pending_invitations WHERE event_id = $1 ORDER BY created_at`,
		eventID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []model.PendingInvitation
	for rows.Next() {
		var p model.PendingInvitation
		if err := rows.Scan(&p.ID, &p.EventID, &p.Email, &p.InvitedBy, &p.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, p)
	}
	return result, rows.Err()
}
