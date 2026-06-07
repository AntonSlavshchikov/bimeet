package pollrepo

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

// Create inserts a poll with its options and returns the enriched poll.
func (r *Repository) Create(ctx context.Context, eventID, createdBy uuid.UUID, question string, options []string) (model.PollInfo, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return model.PollInfo{}, fmt.Errorf("begin: %w", err)
	}
	defer tx.Rollback(ctx)

	var p model.PollInfo
	if err := tx.QueryRow(ctx,
		`INSERT INTO polls (event_id, question, created_by) VALUES ($1, $2, $3)
		 RETURNING id, question, created_by, created_at`,
		eventID, question, createdBy,
	).Scan(&p.ID, &p.Question, &p.CreatedBy, &p.CreatedAt); err != nil {
		return model.PollInfo{}, fmt.Errorf("insert poll: %w", err)
	}

	p.Options = []model.PollOptionInfo{}
	for _, label := range options {
		var o model.PollOptionInfo
		if err := tx.QueryRow(ctx,
			`INSERT INTO poll_options (poll_id, label) VALUES ($1, $2) RETURNING id, label`,
			p.ID, label,
		).Scan(&o.ID, &o.Label); err != nil {
			return model.PollInfo{}, fmt.Errorf("insert option: %w", err)
		}
		o.Votes = []uuid.UUID{}
		p.Options = append(p.Options, o)
	}

	if err := tx.Commit(ctx); err != nil {
		return model.PollInfo{}, fmt.Errorf("commit: %w", err)
	}
	return p, nil
}

// Vote records a single vote per user per poll (changing the vote replaces it).
// It verifies the poll belongs to the event and the option belongs to the poll.
func (r *Repository) Vote(ctx context.Context, eventID, pollID, optionID, userID uuid.UUID) error {
	var ok bool
	if err := r.pool.QueryRow(ctx,
		`SELECT EXISTS(
		   SELECT 1 FROM poll_options o JOIN polls p ON p.id = o.poll_id
		   WHERE o.id=$1 AND o.poll_id=$2 AND p.event_id=$3)`,
		optionID, pollID, eventID,
	).Scan(&ok); err != nil {
		return fmt.Errorf("verify option: %w", err)
	}
	if !ok {
		return fmt.Errorf("invalid poll option")
	}

	_, err := r.pool.Exec(ctx,
		`INSERT INTO poll_votes (poll_id, user_id, poll_option_id) VALUES ($1, $2, $3)
		 ON CONFLICT (poll_id, user_id) DO UPDATE SET poll_option_id = EXCLUDED.poll_option_id`,
		pollID, userID, optionID,
	)
	if err != nil {
		return fmt.Errorf("vote: %w", err)
	}
	return nil
}
