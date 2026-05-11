package adminrepo

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"bimeet/internal/model"
)

type Repository struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

// Overview returns aggregate KPIs in a single round-trip.
//
// "active" user means: created OR confirmed participation in any event in the
// last N days. We approximate this as "has organized OR confirmed in window".
func (r *Repository) Overview(ctx context.Context) (model.AdminOverview, error) {
	var o model.AdminOverview
	err := r.pool.QueryRow(ctx, `
		SELECT
			(SELECT COUNT(*) FROM users)                                                                AS total_users,
			(SELECT COUNT(DISTINCT u.id) FROM users u
				WHERE u.id IN (
					SELECT organizer_id FROM events WHERE created_at > NOW() - INTERVAL '7 days'
					UNION
					SELECT user_id FROM event_participants WHERE status = 'confirmed'
						AND event_id IN (SELECT id FROM events WHERE updated_at > NOW() - INTERVAL '7 days')
				))                                                                                      AS users_active_7d,
			(SELECT COUNT(DISTINCT u.id) FROM users u
				WHERE u.id IN (
					SELECT organizer_id FROM events WHERE created_at > NOW() - INTERVAL '30 days'
					UNION
					SELECT user_id FROM event_participants WHERE status = 'confirmed'
						AND event_id IN (SELECT id FROM events WHERE updated_at > NOW() - INTERVAL '30 days')
				))                                                                                      AS users_active_30d,
			(SELECT COUNT(*) FROM events)                                                              AS total_events,
			(SELECT COUNT(*) FROM events WHERE status = 'active')                                      AS events_active,
			(SELECT COUNT(*) FROM events WHERE status = 'completed')                                   AS events_completed,
			(SELECT COUNT(*) FROM collections)                                                         AS total_collections,
			(SELECT COALESCE(SUM(c.per_person_amount), 0)
				FROM collection_contributions cc
				JOIN collections c ON c.id = cc.collection_id
				WHERE cc.status = 'paid')                                                              AS total_collected
	`).Scan(
		&o.TotalUsers, &o.UsersActive7d, &o.UsersActive30d,
		&o.TotalEvents, &o.EventsActive, &o.EventsCompleted,
		&o.TotalCollections, &o.TotalCollected,
	)
	if err != nil {
		return model.AdminOverview{}, fmt.Errorf("admin overview: %w", err)
	}
	return o, nil
}

// Timeseries returns daily registrations and event-creations for the last `days` days.
// Missing days are filled with zeros so charts don't have gaps.
func (r *Repository) Timeseries(ctx context.Context, days int) (model.AdminTimeseries, error) {
	if days <= 0 {
		days = 30
	}

	usersByDay, err := r.countByDay(ctx, "users", days)
	if err != nil {
		return model.AdminTimeseries{}, fmt.Errorf("users timeseries: %w", err)
	}
	eventsByDay, err := r.countByDay(ctx, "events", days)
	if err != nil {
		return model.AdminTimeseries{}, fmt.Errorf("events timeseries: %w", err)
	}

	points := make([]model.AdminTimeseriesPoint, 0, days)
	today := time.Now().UTC().Truncate(24 * time.Hour)
	for i := days - 1; i >= 0; i-- {
		d := today.AddDate(0, 0, -i)
		key := d.Format("2006-01-02")
		points = append(points, model.AdminTimeseriesPoint{
			Date:   key,
			Users:  usersByDay[key],
			Events: eventsByDay[key],
		})
	}
	return model.AdminTimeseries{Points: points}, nil
}

func (r *Repository) countByDay(ctx context.Context, table string, days int) (map[string]int, error) {
	q := fmt.Sprintf(`
		SELECT TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS d, COUNT(*)
		FROM %s
		WHERE created_at > NOW() - ($1::int || ' days')::interval
		GROUP BY d
	`, table)
	rows, err := r.pool.Query(ctx, q, days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make(map[string]int)
	for rows.Next() {
		var day string
		var n int
		if err := rows.Scan(&day, &n); err != nil {
			return nil, err
		}
		out[day] = n
	}
	return out, rows.Err()
}

// Distribution returns three groupings of events: by category, status, visibility.
func (r *Repository) Distribution(ctx context.Context) (model.AdminDistribution, error) {
	byCategory, err := r.groupCount(ctx, `SELECT category, COUNT(*) FROM events GROUP BY category`)
	if err != nil {
		return model.AdminDistribution{}, fmt.Errorf("by category: %w", err)
	}
	byStatus, err := r.groupCount(ctx, `SELECT status, COUNT(*) FROM events GROUP BY status`)
	if err != nil {
		return model.AdminDistribution{}, fmt.Errorf("by status: %w", err)
	}
	byVisibility, err := r.groupCount(ctx,
		`SELECT CASE WHEN is_public THEN 'public' ELSE 'private' END, COUNT(*) FROM events GROUP BY is_public`)
	if err != nil {
		return model.AdminDistribution{}, fmt.Errorf("by visibility: %w", err)
	}

	return model.AdminDistribution{
		ByCategory:   byCategory,
		ByStatus:     byStatus,
		ByVisibility: byVisibility,
	}, nil
}

func (r *Repository) groupCount(ctx context.Context, q string) ([]model.AdminDistributionItem, error) {
	rows, err := r.pool.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []model.AdminDistributionItem
	for rows.Next() {
		var it model.AdminDistributionItem
		if err := rows.Scan(&it.Key, &it.Count); err != nil {
			return nil, err
		}
		out = append(out, it)
	}
	return out, rows.Err()
}

func (r *Repository) TopOrganizers(ctx context.Context, limit int) ([]model.OrganizerStat, error) {
	if limit <= 0 {
		limit = 10
	}
	rows, err := r.pool.Query(ctx, `
		SELECT u.id, u.name, u.email, COUNT(e.id) AS cnt
		FROM users u
		JOIN events e ON e.organizer_id = u.id
		GROUP BY u.id, u.name, u.email
		ORDER BY cnt DESC, u.created_at ASC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, fmt.Errorf("top organizers: %w", err)
	}
	defer rows.Close()

	var out []model.OrganizerStat
	for rows.Next() {
		var s model.OrganizerStat
		if err := rows.Scan(&s.UserID, &s.Name, &s.Email, &s.EventCount); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r *Repository) RecentUsers(ctx context.Context, limit int) ([]model.AdminUserRow, error) {
	if limit <= 0 {
		limit = 20
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id, name, last_name, email, city, created_at
		FROM users
		ORDER BY created_at DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, fmt.Errorf("recent users: %w", err)
	}
	defer rows.Close()

	var out []model.AdminUserRow
	for rows.Next() {
		var u model.AdminUserRow
		if err := rows.Scan(&u.ID, &u.Name, &u.LastName, &u.Email, &u.City, &u.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

func (r *Repository) RecentEvents(ctx context.Context, limit int) ([]model.AdminEventRow, error) {
	if limit <= 0 {
		limit = 20
	}
	rows, err := r.pool.Query(ctx, `
		SELECT e.id, e.title, e.category, e.status, e.is_public,
		       e.organizer_id, u.email, e.date_start, e.created_at
		FROM events e
		JOIN users u ON u.id = e.organizer_id
		ORDER BY e.created_at DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, fmt.Errorf("recent events: %w", err)
	}
	defer rows.Close()

	var out []model.AdminEventRow
	for rows.Next() {
		var ev model.AdminEventRow
		if err := rows.Scan(&ev.ID, &ev.Title, &ev.Category, &ev.Status, &ev.IsPublic,
			&ev.OrganizerID, &ev.OrganizerEmail, &ev.DateStart, &ev.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, ev)
	}
	return out, rows.Err()
}
