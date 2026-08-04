package refreshrepo

import (
	"context"
	"errors"
	"fmt"
	"time"

	"bimeet/internal/model"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

// Create starts a stable server-side session and stores only a digest of the
// refresh token. The raw token never reaches the database.
func (r *Repository) Create(ctx context.Context, userID uuid.UUID, tokenHash, userAgent string, expiresAt time.Time) (model.AuthSession, error) {
	var session model.AuthSession
	err := r.pool.QueryRow(ctx, `
		INSERT INTO refresh_tokens (user_id, token_hash, user_agent, expires_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id, user_id, user_agent, created_at, last_seen_at, expires_at
	`, userID, tokenHash, userAgent, expiresAt).Scan(
		&session.ID,
		&session.UserID,
		&session.UserAgent,
		&session.CreatedAt,
		&session.LastSeenAt,
		&session.ExpiresAt,
	)
	if err != nil {
		return model.AuthSession{}, fmt.Errorf("create auth session: %w", err)
	}
	return session, nil
}

// Rotate atomically replaces the one-time refresh-token digest while keeping
// the session ID stable. Concurrent reuse of currentHash can succeed once.
func (r *Repository) Rotate(ctx context.Context, currentHash, nextHash, userAgent string) (model.AuthSession, bool, error) {
	var session model.AuthSession
	err := r.pool.QueryRow(ctx, `
		UPDATE refresh_tokens
		SET token_hash = $2,
			user_agent = CASE WHEN $3 = '' THEN user_agent ELSE $3 END,
			last_seen_at = NOW()
		WHERE token_hash = $1
		  AND revoked_at IS NULL
		  AND expires_at > NOW()
		RETURNING id, user_id, user_agent, created_at, last_seen_at, expires_at
	`, currentHash, nextHash, userAgent).Scan(
		&session.ID,
		&session.UserID,
		&session.UserAgent,
		&session.CreatedAt,
		&session.LastSeenAt,
		&session.ExpiresAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return model.AuthSession{}, false, nil
		}
		return model.AuthSession{}, false, fmt.Errorf("rotate refresh token: %w", err)
	}
	return session, true, nil
}

// ListByUser returns active, unexpired sessions with the most recently used
// session first.
func (r *Repository) ListByUser(ctx context.Context, userID uuid.UUID) ([]model.AuthSession, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, user_agent, created_at, last_seen_at, expires_at
		FROM refresh_tokens
		WHERE user_id = $1
		  AND revoked_at IS NULL
		  AND expires_at > NOW()
		ORDER BY last_seen_at DESC, created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("list auth sessions: %w", err)
	}
	defer rows.Close()

	sessions := make([]model.AuthSession, 0)
	for rows.Next() {
		var session model.AuthSession
		if err := rows.Scan(
			&session.ID,
			&session.UserID,
			&session.UserAgent,
			&session.CreatedAt,
			&session.LastSeenAt,
			&session.ExpiresAt,
		); err != nil {
			return nil, fmt.Errorf("scan auth session: %w", err)
		}
		sessions = append(sessions, session)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate auth sessions: %w", err)
	}
	return sessions, nil
}

// Revoke ends the session identified by a refresh token during logout.
func (r *Repository) Revoke(ctx context.Context, tokenHash string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE refresh_tokens
		SET revoked_at = COALESCE(revoked_at, NOW())
		WHERE token_hash = $1
	`, tokenHash)
	if err != nil {
		return fmt.Errorf("revoke auth session by token: %w", err)
	}
	return nil
}

// RevokeByID ends one session only when it belongs to userID.
func (r *Repository) RevokeByID(ctx context.Context, userID, sessionID uuid.UUID) (bool, error) {
	result, err := r.pool.Exec(ctx, `
		UPDATE refresh_tokens
		SET revoked_at = COALESCE(revoked_at, NOW())
		WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
	`, sessionID, userID)
	if err != nil {
		return false, fmt.Errorf("revoke auth session: %w", err)
	}
	return result.RowsAffected() > 0, nil
}

// RevokeOthers ends every active session except currentSessionID.
func (r *Repository) RevokeOthers(ctx context.Context, userID, currentSessionID uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE refresh_tokens
		SET revoked_at = NOW()
		WHERE user_id = $1 AND id <> $2 AND revoked_at IS NULL
	`, userID, currentSessionID)
	if err != nil {
		return fmt.Errorf("revoke other auth sessions: %w", err)
	}
	return nil
}

// IsActive validates a JWT's user/session pair and updates last_seen_at at most
// once every five minutes, keeping the profile activity timestamp useful
// without turning every authenticated request into a row write.
func (r *Repository) IsActive(ctx context.Context, userID, sessionID uuid.UUID) (bool, error) {
	var active bool
	err := r.pool.QueryRow(ctx, `
		WITH valid AS (
			SELECT id
			FROM refresh_tokens
			WHERE id = $1
			  AND user_id = $2
			  AND revoked_at IS NULL
			  AND expires_at > NOW()
		), touched AS (
			UPDATE refresh_tokens AS session
			SET last_seen_at = NOW()
			FROM valid
			WHERE session.id = valid.id
			  AND session.last_seen_at < NOW() - INTERVAL '5 minutes'
			RETURNING session.id
		)
		SELECT EXISTS(SELECT 1 FROM valid)
	`, sessionID, userID).Scan(&active)
	if err != nil {
		return false, fmt.Errorf("validate auth session: %w", err)
	}
	return active, nil
}
