package eventrepo

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"bimeet-teams/internal/model"
)

type Repository struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

const eventColumns = `id, company_id, organizer_id, title, description, date_start, date_end, location, meeting_url, status, created_at, updated_at`

func scanEvent(row pgx.Row) (model.Event, error) {
	var e model.Event
	err := row.Scan(&e.ID, &e.CompanyID, &e.OrganizerID, &e.Title, &e.Description,
		&e.DateStart, &e.DateEnd, &e.Location, &e.MeetingURL, &e.Status, &e.CreatedAt, &e.UpdatedAt)
	return e, err
}

func (r *Repository) Create(ctx context.Context, companyID, organizerID uuid.UUID, req model.CreateEventRequest) (model.Event, error) {
	row := r.pool.QueryRow(ctx,
		`INSERT INTO events (company_id, organizer_id, title, description, date_start, date_end, location, meeting_url)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING `+eventColumns,
		companyID, organizerID, req.Title, req.Description, req.DateStart, req.DateEnd, req.Location, req.MeetingURL,
	)
	e, err := scanEvent(row)
	if err != nil {
		return model.Event{}, fmt.Errorf("create event: %w", err)
	}
	// The organizer is implicitly a confirmed participant.
	if _, err := r.pool.Exec(ctx,
		`INSERT INTO event_participants (event_id, user_id, status) VALUES ($1, $2, 'confirmed')
		 ON CONFLICT (event_id, user_id) DO NOTHING`,
		e.ID, organizerID,
	); err != nil {
		return model.Event{}, fmt.Errorf("add organizer participant: %w", err)
	}
	return e, nil
}

// GetByID returns the raw event (used by services for authorization checks).
func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (model.Event, error) {
	row := r.pool.QueryRow(ctx, `SELECT `+eventColumns+` FROM events WHERE id=$1`, id)
	e, err := scanEvent(row)
	if err != nil {
		return model.Event{}, fmt.Errorf("get event by id: %w", err)
	}
	return e, nil
}

func (r *Repository) Update(ctx context.Context, id uuid.UUID, req model.UpdateEventRequest) (model.Event, error) {
	row := r.pool.QueryRow(ctx,
		`UPDATE events SET
		   title       = COALESCE($2, title),
		   description = COALESCE($3, description),
		   date_start  = COALESCE($4, date_start),
		   date_end    = COALESCE($5, date_end),
		   location    = COALESCE($6, location),
		   meeting_url = COALESCE($7, meeting_url),
		   updated_at  = NOW()
		 WHERE id=$1
		 RETURNING `+eventColumns,
		id, req.Title, req.Description, req.DateStart, req.DateEnd, req.Location, req.MeetingURL,
	)
	e, err := scanEvent(row)
	if err != nil {
		return model.Event{}, fmt.Errorf("update event: %w", err)
	}
	return e, nil
}

func (r *Repository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM events WHERE id=$1`, id)
	if err != nil {
		return fmt.Errorf("delete event: %w", err)
	}
	return nil
}

func (r *Repository) Complete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `UPDATE events SET status='completed', updated_at=NOW() WHERE id=$1`, id)
	if err != nil {
		return fmt.Errorf("complete event: %w", err)
	}
	return nil
}

// ListForUser returns events in the user's company where they are the organizer
// or a participant — lightweight list items with confirmed counts and my status.
func (r *Repository) ListForUser(ctx context.Context, companyID, userID uuid.UUID) ([]model.EventListItem, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT e.id, e.title, e.description, e.date_start, e.date_end, e.location, e.meeting_url,
		        e.status, e.created_at,
		        o.id, o.name, o.email,
		        COALESCE(mine.status, '') AS my_status,
		        (SELECT COUNT(*) FROM event_participants p WHERE p.event_id = e.id AND p.status='confirmed') AS confirmed
		 FROM events e
		 JOIN users o ON o.id = e.organizer_id
		 LEFT JOIN event_participants mine ON mine.event_id = e.id AND mine.user_id = $2
		 WHERE e.company_id = $1
		   AND (e.organizer_id = $2 OR mine.user_id IS NOT NULL)
		 ORDER BY e.date_start DESC`,
		companyID, userID,
	)
	if err != nil {
		return nil, fmt.Errorf("list events: %w", err)
	}
	defer rows.Close()

	items := []model.EventListItem{}
	for rows.Next() {
		var it model.EventListItem
		if err := rows.Scan(&it.ID, &it.Title, &it.Description, &it.DateStart, &it.DateEnd,
			&it.Location, &it.MeetingURL, &it.Status, &it.CreatedAt,
			&it.Organizer.ID, &it.Organizer.Name, &it.Organizer.Email,
			&it.MyStatus, &it.ConfirmedCount); err != nil {
			return nil, fmt.Errorf("scan event list item: %w", err)
		}
		it.Participants = []model.ParticipantInfo{}
		items = append(items, it)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Attach participants per event (small N for a single company's meetings).
	for i := range items {
		parts, err := r.ListParticipantsInfo(ctx, items[i].ID)
		if err != nil {
			return nil, err
		}
		items[i].Participants = parts
	}
	return items, nil
}

// GetDetail assembles the enriched event: participants, links, polls, changelog.
func (r *Repository) GetDetail(ctx context.Context, eventID uuid.UUID) (model.EventDetail, error) {
	var d model.EventDetail
	row := r.pool.QueryRow(ctx,
		`SELECT e.id, e.title, e.description, e.date_start, e.date_end, e.location, e.meeting_url,
		        e.status, e.created_at, e.updated_at, o.id, o.name, o.email
		 FROM events e JOIN users o ON o.id = e.organizer_id
		 WHERE e.id=$1`, eventID,
	)
	if err := row.Scan(&d.ID, &d.Title, &d.Description, &d.DateStart, &d.DateEnd, &d.Location,
		&d.MeetingURL, &d.Status, &d.CreatedAt, &d.UpdatedAt,
		&d.Organizer.ID, &d.Organizer.Name, &d.Organizer.Email); err != nil {
		return model.EventDetail{}, fmt.Errorf("get event detail: %w", err)
	}

	parts, err := r.ListParticipantsInfo(ctx, eventID)
	if err != nil {
		return model.EventDetail{}, err
	}
	d.Participants = parts
	for _, p := range parts {
		if p.Status == "confirmed" {
			d.ConfirmedCount++
		}
	}

	if d.Links, err = r.listLinks(ctx, eventID); err != nil {
		return model.EventDetail{}, err
	}
	if d.Polls, err = r.listPolls(ctx, eventID); err != nil {
		return model.EventDetail{}, err
	}
	if d.ChangeLog, err = r.listChangeLog(ctx, eventID); err != nil {
		return model.EventDetail{}, err
	}
	return d, nil
}

// ─── Participants ──────────────────────────────────────────────────────────

func (r *Repository) ListParticipantsInfo(ctx context.Context, eventID uuid.UUID) ([]model.ParticipantInfo, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT p.id, p.user_id, u.name, u.email, p.status
		 FROM event_participants p JOIN users u ON u.id = p.user_id
		 WHERE p.event_id=$1 ORDER BY u.name`, eventID,
	)
	if err != nil {
		return nil, fmt.Errorf("list participants: %w", err)
	}
	defer rows.Close()

	out := []model.ParticipantInfo{}
	for rows.Next() {
		var p model.ParticipantInfo
		if err := rows.Scan(&p.ID, &p.User.ID, &p.User.Name, &p.User.Email, &p.Status); err != nil {
			return nil, fmt.Errorf("scan participant: %w", err)
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// AddParticipant invites a user (idempotent). Returns whether a row was created.
func (r *Repository) AddParticipant(ctx context.Context, eventID, userID uuid.UUID) (bool, error) {
	tag, err := r.pool.Exec(ctx,
		`INSERT INTO event_participants (event_id, user_id, status) VALUES ($1, $2, 'invited')
		 ON CONFLICT (event_id, user_id) DO NOTHING`,
		eventID, userID,
	)
	if err != nil {
		return false, fmt.Errorf("add participant: %w", err)
	}
	return tag.RowsAffected() > 0, nil
}

func (r *Repository) UpdateParticipantStatus(ctx context.Context, eventID, userID uuid.UUID, status string) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE event_participants SET status=$3 WHERE event_id=$1 AND user_id=$2`,
		eventID, userID, status,
	)
	if err != nil {
		return fmt.Errorf("update participant status: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("not a participant")
	}
	return nil
}

func (r *Repository) IsParticipant(ctx context.Context, eventID, userID uuid.UUID) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM event_participants WHERE event_id=$1 AND user_id=$2)`,
		eventID, userID,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("is participant: %w", err)
	}
	return exists, nil
}

// ParticipantUserIDs returns the user IDs of everyone attached to an event
// (used to fan out notifications).
func (r *Repository) ParticipantUserIDs(ctx context.Context, eventID uuid.UUID) ([]uuid.UUID, error) {
	rows, err := r.pool.Query(ctx, `SELECT user_id FROM event_participants WHERE event_id=$1`, eventID)
	if err != nil {
		return nil, fmt.Errorf("participant ids: %w", err)
	}
	defer rows.Close()
	var ids []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

// ─── Change log ────────────────────────────────────────────────────────────

func (r *Repository) AddChangeLog(ctx context.Context, eventID, changedBy uuid.UUID, field, oldVal, newVal string) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO event_change_logs (event_id, changed_by, field_name, old_value, new_value)
		 VALUES ($1, $2, $3, $4, $5)`,
		eventID, changedBy, field, oldVal, newVal,
	)
	if err != nil {
		return fmt.Errorf("add change log: %w", err)
	}
	return nil
}

func (r *Repository) listChangeLog(ctx context.Context, eventID uuid.UUID) ([]model.ChangeLogInfo, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT cl.id, cl.changed_by, u.name, u.email, cl.field_name, cl.old_value, cl.new_value, cl.changed_at
		 FROM event_change_logs cl JOIN users u ON u.id = cl.changed_by
		 WHERE cl.event_id=$1 ORDER BY cl.changed_at`, eventID,
	)
	if err != nil {
		return nil, fmt.Errorf("list change log: %w", err)
	}
	defer rows.Close()

	out := []model.ChangeLogInfo{}
	for rows.Next() {
		var c model.ChangeLogInfo
		if err := rows.Scan(&c.ID, &c.ChangedBy.ID, &c.ChangedBy.Name, &c.ChangedBy.Email,
			&c.FieldName, &c.OldValue, &c.NewValue, &c.ChangedAt); err != nil {
			return nil, fmt.Errorf("scan change log: %w", err)
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// ─── Links / Polls assembly (read side for the detail view) ────────────────

func (r *Repository) listLinks(ctx context.Context, eventID uuid.UUID) ([]model.LinkInfo, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, title, url, created_by, created_at FROM event_links WHERE event_id=$1 ORDER BY created_at`,
		eventID,
	)
	if err != nil {
		return nil, fmt.Errorf("list links: %w", err)
	}
	defer rows.Close()

	out := []model.LinkInfo{}
	for rows.Next() {
		var l model.LinkInfo
		if err := rows.Scan(&l.ID, &l.Title, &l.URL, &l.CreatedBy, &l.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan link: %w", err)
		}
		out = append(out, l)
	}
	return out, rows.Err()
}

func (r *Repository) listPolls(ctx context.Context, eventID uuid.UUID) ([]model.PollInfo, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, question, created_by, created_at FROM polls WHERE event_id=$1 ORDER BY created_at`,
		eventID,
	)
	if err != nil {
		return nil, fmt.Errorf("list polls: %w", err)
	}
	defer rows.Close()

	polls := []model.PollInfo{}
	for rows.Next() {
		var p model.PollInfo
		if err := rows.Scan(&p.ID, &p.Question, &p.CreatedBy, &p.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan poll: %w", err)
		}
		p.Options = []model.PollOptionInfo{}
		polls = append(polls, p)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	for i := range polls {
		opts, err := r.pollOptions(ctx, polls[i].ID)
		if err != nil {
			return nil, err
		}
		polls[i].Options = opts
	}
	return polls, nil
}

func (r *Repository) pollOptions(ctx context.Context, pollID uuid.UUID) ([]model.PollOptionInfo, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT o.id, o.label, COALESCE(array_remove(array_agg(v.user_id), NULL), '{}')
		 FROM poll_options o
		 LEFT JOIN poll_votes v ON v.poll_option_id = o.id
		 WHERE o.poll_id=$1
		 GROUP BY o.id, o.label
		 ORDER BY o.id`, pollID,
	)
	if err != nil {
		return nil, fmt.Errorf("poll options: %w", err)
	}
	defer rows.Close()

	out := []model.PollOptionInfo{}
	for rows.Next() {
		var o model.PollOptionInfo
		if err := rows.Scan(&o.ID, &o.Label, &o.Votes); err != nil {
			return nil, fmt.Errorf("scan poll option: %w", err)
		}
		out = append(out, o)
	}
	return out, rows.Err()
}
