package userrepo

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

const userColumns = `id, name, last_name, email, birth_date, city, avatar_url, created_at`

func scanUser(row interface {
	Scan(...any) error
}) (model.User, error) {
	var u model.User
	err := row.Scan(&u.ID, &u.Name, &u.LastName, &u.Email, &u.BirthDate, &u.City, &u.AvatarURL, &u.CreatedAt)
	return u, err
}

func (r *Repository) Create(ctx context.Context, name, email string) (model.User, error) {
	row := r.pool.QueryRow(ctx,
		`INSERT INTO users (name, email)
		 VALUES ($1, $2)
		 RETURNING `+userColumns,
		name, email,
	)
	u, err := scanUser(row)
	if err != nil {
		return model.User{}, fmt.Errorf("create user: %w", err)
	}
	return u, nil
}

func (r *Repository) GetByEmail(ctx context.Context, email string) (model.User, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT `+userColumns+` FROM users WHERE email=$1`, email,
	)
	u, err := scanUser(row)
	if err != nil {
		return model.User{}, fmt.Errorf("get user by email: %w", err)
	}
	return u, nil
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (model.User, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT `+userColumns+` FROM users WHERE id=$1`, id,
	)
	u, err := scanUser(row)
	if err != nil {
		return model.User{}, fmt.Errorf("get user by id: %w", err)
	}
	return u, nil
}

func (r *Repository) UpdateProfile(ctx context.Context, id uuid.UUID, req model.UpdateProfileRequest) (model.User, error) {
	var birthDate *time.Time
	if req.BirthDate != "" {
		t, err := time.Parse("2006-01-02", req.BirthDate)
		if err != nil {
			return model.User{}, fmt.Errorf("invalid birth_date format: %w", err)
		}
		birthDate = &t
	}

	row := r.pool.QueryRow(ctx,
		`UPDATE users
		 SET name=$1, last_name=$2, birth_date=$3, city=$4
		 WHERE id=$5
		 RETURNING `+userColumns,
		req.Name, req.LastName, birthDate, req.City, id,
	)
	u, err := scanUser(row)
	if err != nil {
		return model.User{}, fmt.Errorf("update profile: %w", err)
	}
	return u, nil
}

func (r *Repository) UpdateAvatar(ctx context.Context, id uuid.UUID, url string) (model.User, error) {
	row := r.pool.QueryRow(ctx,
		`UPDATE users SET avatar_url=$1 WHERE id=$2 RETURNING `+userColumns,
		url, id,
	)
	u, err := scanUser(row)
	if err != nil {
		return model.User{}, fmt.Errorf("update avatar: %w", err)
	}
	return u, nil
}

func (r *Repository) ClearAvatar(ctx context.Context, id uuid.UUID) (model.User, error) {
	row := r.pool.QueryRow(ctx,
		`UPDATE users SET avatar_url=NULL WHERE id=$1 RETURNING `+userColumns,
		id,
	)
	u, err := scanUser(row)
	if err != nil {
		return model.User{}, fmt.Errorf("clear avatar: %w", err)
	}
	return u, nil
}

func (r *Repository) GetStats(ctx context.Context, id uuid.UUID) (model.ProfileStats, error) {
	var stats model.ProfileStats
	err := r.pool.QueryRow(ctx, `
		SELECT
			(SELECT COUNT(*) FROM events WHERE organizer_id = $1)                                                          AS organized,
			(SELECT COUNT(*) FROM events e
			 WHERE e.status = 'completed'
			   AND (e.organizer_id = $1 OR EXISTS (
			       SELECT 1 FROM event_participants ep
			       WHERE ep.event_id = e.id AND ep.user_id = $1 AND ep.status = 'confirmed'
			   )))                                                                                                         AS participated,
			(SELECT COUNT(*) FROM events WHERE organizer_id = $1 AND status = 'completed')                                 AS completed,
			(SELECT COUNT(*) FROM event_participants ep JOIN events e ON e.id = ep.event_id
			 WHERE ep.user_id = $1 AND ep.status = 'confirmed' AND e.status = 'active' AND e.organizer_id <> $1)            AS upcoming
	`, id).Scan(&stats.Organized, &stats.Participated, &stats.Completed, &stats.Upcoming)
	if err != nil {
		return model.ProfileStats{}, fmt.Errorf("get stats: %w", err)
	}
	return stats, nil
}
