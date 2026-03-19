package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"meetup/internal/model"
)

type EventRepository struct {
	pool *pgxpool.Pool
}

func NewEventRepository(pool *pgxpool.Pool) *EventRepository {
	return &EventRepository{pool: pool}
}

func (r *EventRepository) Create(ctx context.Context, req model.CreateEventRequest, organizerID uuid.UUID) (model.Event, error) {
	var e model.Event
	err := r.pool.QueryRow(ctx,
		`INSERT INTO events (title, description, date_start, date_end, location, organizer_id)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, title, description, date_start, date_end, location, organizer_id, invite_token, created_at, updated_at`,
		req.Title, req.Description, req.DateStart, req.DateEnd, req.Location, organizerID,
	).Scan(&e.ID, &e.Title, &e.Description, &e.DateStart, &e.DateEnd, &e.Location,
		&e.OrganizerID, &e.InviteToken, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		return model.Event{}, fmt.Errorf("create event: %w", err)
	}
	return e, nil
}

func (r *EventRepository) GetByID(ctx context.Context, id uuid.UUID) (model.Event, error) {
	var e model.Event
	err := r.pool.QueryRow(ctx,
		`SELECT id, title, description, date_start, date_end, location, organizer_id, invite_token, created_at, updated_at
		 FROM events WHERE id=$1`,
		id,
	).Scan(&e.ID, &e.Title, &e.Description, &e.DateStart, &e.DateEnd, &e.Location,
		&e.OrganizerID, &e.InviteToken, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		return model.Event{}, fmt.Errorf("get event by id: %w", err)
	}
	return e, nil
}

func (r *EventRepository) GetByInviteToken(ctx context.Context, token uuid.UUID) (model.Event, error) {
	var e model.Event
	err := r.pool.QueryRow(ctx,
		`SELECT id, title, description, date_start, date_end, location, organizer_id, invite_token, created_at, updated_at
		 FROM events WHERE invite_token=$1`,
		token,
	).Scan(&e.ID, &e.Title, &e.Description, &e.DateStart, &e.DateEnd, &e.Location,
		&e.OrganizerID, &e.InviteToken, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		return model.Event{}, fmt.Errorf("get event by invite token: %w", err)
	}
	return e, nil
}

func (r *EventRepository) ListForUser(ctx context.Context, userID uuid.UUID) ([]model.Event, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT DISTINCT e.id, e.title, e.description, e.date_start, e.date_end, e.location,
		        e.organizer_id, e.invite_token, e.created_at, e.updated_at
		 FROM events e
		 LEFT JOIN event_participants ep ON ep.event_id = e.id AND ep.user_id = $1
		 WHERE e.organizer_id = $1 OR ep.user_id = $1
		 ORDER BY e.date_start`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("list events for user: %w", err)
	}
	defer rows.Close()

	var events []model.Event
	for rows.Next() {
		var e model.Event
		if err := rows.Scan(&e.ID, &e.Title, &e.Description, &e.DateStart, &e.DateEnd, &e.Location,
			&e.OrganizerID, &e.InviteToken, &e.CreatedAt, &e.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan event: %w", err)
		}
		events = append(events, e)
	}
	return events, rows.Err()
}

func (r *EventRepository) Update(ctx context.Context, id uuid.UUID, req model.UpdateEventRequest) (model.Event, error) {
	var e model.Event
	err := r.pool.QueryRow(ctx,
		`UPDATE events SET
		   title       = COALESCE($2, title),
		   description = COALESCE($3, description),
		   date_start  = COALESCE($4, date_start),
		   date_end    = COALESCE($5, date_end),
		   location    = COALESCE($6, location),
		   updated_at  = NOW()
		 WHERE id=$1
		 RETURNING id, title, description, date_start, date_end, location, organizer_id, invite_token, created_at, updated_at`,
		id, req.Title, req.Description, req.DateStart, req.DateEnd, req.Location,
	).Scan(&e.ID, &e.Title, &e.Description, &e.DateStart, &e.DateEnd, &e.Location,
		&e.OrganizerID, &e.InviteToken, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		return model.Event{}, fmt.Errorf("update event: %w", err)
	}
	return e, nil
}

func (r *EventRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM events WHERE id=$1`, id)
	if err != nil {
		return fmt.Errorf("delete event: %w", err)
	}
	return nil
}

// ─── Participants ─────────────────────────────────────────────────────────

func (r *EventRepository) AddParticipant(ctx context.Context, eventID, userID uuid.UUID, status string) (model.EventParticipant, error) {
	var p model.EventParticipant
	err := r.pool.QueryRow(ctx,
		`INSERT INTO event_participants (event_id, user_id, status)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (event_id, user_id) DO UPDATE SET status = EXCLUDED.status
		 RETURNING id, event_id, user_id, status`,
		eventID, userID, status,
	).Scan(&p.ID, &p.EventID, &p.UserID, &p.Status)
	if err != nil {
		return model.EventParticipant{}, fmt.Errorf("add participant: %w", err)
	}
	return p, nil
}

func (r *EventRepository) UpdateParticipantStatus(ctx context.Context, eventID, userID uuid.UUID, status string) (model.EventParticipant, error) {
	var p model.EventParticipant
	err := r.pool.QueryRow(ctx,
		`UPDATE event_participants SET status=$3
		 WHERE event_id=$1 AND user_id=$2
		 RETURNING id, event_id, user_id, status`,
		eventID, userID, status,
	).Scan(&p.ID, &p.EventID, &p.UserID, &p.Status)
	if err != nil {
		return model.EventParticipant{}, fmt.Errorf("update participant status: %w", err)
	}
	return p, nil
}

func (r *EventRepository) GetParticipant(ctx context.Context, eventID, userID uuid.UUID) (model.EventParticipant, error) {
	var p model.EventParticipant
	err := r.pool.QueryRow(ctx,
		`SELECT id, event_id, user_id, status FROM event_participants WHERE event_id=$1 AND user_id=$2`,
		eventID, userID,
	).Scan(&p.ID, &p.EventID, &p.UserID, &p.Status)
	if err != nil {
		return model.EventParticipant{}, fmt.Errorf("get participant: %w", err)
	}
	return p, nil
}

func (r *EventRepository) ListParticipants(ctx context.Context, eventID uuid.UUID) ([]model.EventParticipant, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, event_id, user_id, status FROM event_participants WHERE event_id=$1`,
		eventID,
	)
	if err != nil {
		return nil, fmt.Errorf("list participants: %w", err)
	}
	defer rows.Close()

	var participants []model.EventParticipant
	for rows.Next() {
		var p model.EventParticipant
		if err := rows.Scan(&p.ID, &p.EventID, &p.UserID, &p.Status); err != nil {
			return nil, fmt.Errorf("scan participant: %w", err)
		}
		participants = append(participants, p)
	}
	return participants, rows.Err()
}

func (r *EventRepository) CountConfirmedParticipants(ctx context.Context, eventID uuid.UUID) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM event_participants WHERE event_id=$1 AND status='confirmed'`,
		eventID,
	).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count confirmed participants: %w", err)
	}
	return count, nil
}

// ─── Change log ───────────────────────────────────────────────────────────

func (r *EventRepository) AddChangeLog(ctx context.Context, eventID, changedBy uuid.UUID, field, oldVal, newVal string) error {
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

func (r *EventRepository) ListChangeLogs(ctx context.Context, eventID uuid.UUID) ([]model.EventChangeLog, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, event_id, changed_by, field_name, old_value, new_value, changed_at
		 FROM event_change_logs WHERE event_id=$1 ORDER BY changed_at`,
		eventID,
	)
	if err != nil {
		return nil, fmt.Errorf("list change logs: %w", err)
	}
	defer rows.Close()

	var logs []model.EventChangeLog
	for rows.Next() {
		var l model.EventChangeLog
		if err := rows.Scan(&l.ID, &l.EventID, &l.ChangedBy, &l.FieldName, &l.OldValue, &l.NewValue, &l.ChangedAt); err != nil {
			return nil, fmt.Errorf("scan change log: %w", err)
		}
		logs = append(logs, l)
	}
	return logs, rows.Err()
}

// GetDetail loads an event with all related data (participants, collections, polls, items, carpools, change_log).
func (r *EventRepository) GetDetail(ctx context.Context, eventID, userID uuid.UUID) (model.EventDetail, error) {
	// 1. Load event + organizer
	var detail model.EventDetail
	var orgID uuid.UUID
	err := r.pool.QueryRow(ctx,
		`SELECT e.id, e.title, e.description, e.date_start, e.date_end, e.location,
		        e.organizer_id, u.name, u.email,
		        e.invite_token, e.created_at, e.updated_at
		 FROM events e
		 JOIN users u ON u.id = e.organizer_id
		 WHERE e.id = $1`,
		eventID,
	).Scan(
		&detail.ID, &detail.Title, &detail.Description, &detail.DateStart, &detail.DateEnd, &detail.Location,
		&orgID, &detail.Organizer.Name, &detail.Organizer.Email,
		&detail.InviteToken, &detail.CreatedAt, &detail.UpdatedAt,
	)
	if err != nil {
		return model.EventDetail{}, fmt.Errorf("get event detail: %w", err)
	}
	detail.Organizer.ID = orgID

	// Check access
	ok, err := r.IsParticipant(ctx, eventID, userID)
	if err != nil {
		return model.EventDetail{}, err
	}
	if !ok {
		return model.EventDetail{}, fmt.Errorf("forbidden")
	}

	// 2. Participants with user info
	pRows, err := r.pool.Query(ctx,
		`SELECT ep.id, ep.user_id, u.name, u.email, ep.status
		 FROM event_participants ep
		 JOIN users u ON u.id = ep.user_id
		 WHERE ep.event_id = $1`,
		eventID,
	)
	if err != nil {
		return model.EventDetail{}, fmt.Errorf("list participants detail: %w", err)
	}
	detail.Participants = []model.ParticipantInfo{}
	for pRows.Next() {
		var p model.ParticipantInfo
		if err := pRows.Scan(&p.ID, &p.User.ID, &p.User.Name, &p.User.Email, &p.Status); err != nil {
			pRows.Close()
			return model.EventDetail{}, fmt.Errorf("scan participant detail: %w", err)
		}
		detail.Participants = append(detail.Participants, p)
	}
	pRows.Close()
	if err := pRows.Err(); err != nil {
		return model.EventDetail{}, err
	}

	// 3. Collections with contributions
	colRows, err := r.pool.Query(ctx,
		`SELECT id, title, target_amount, created_by, created_at FROM collections WHERE event_id = $1 ORDER BY created_at`,
		eventID,
	)
	if err != nil {
		return model.EventDetail{}, fmt.Errorf("list collections detail: %w", err)
	}
	detail.Collections = []model.CollectionInfo{}
	for colRows.Next() {
		var c model.CollectionInfo
		if err := colRows.Scan(&c.ID, &c.Title, &c.TargetAmount, &c.CreatedBy, &c.CreatedAt); err != nil {
			colRows.Close()
			return model.EventDetail{}, fmt.Errorf("scan collection detail: %w", err)
		}
		detail.Collections = append(detail.Collections, c)
	}
	colRows.Close()
	if err := colRows.Err(); err != nil {
		return model.EventDetail{}, err
	}
	for i, col := range detail.Collections {
		ctRows, err := r.pool.Query(ctx,
			`SELECT user_id, paid, paid_at FROM collection_contributions WHERE collection_id = $1`,
			col.ID,
		)
		if err != nil {
			return model.EventDetail{}, fmt.Errorf("list contributions detail: %w", err)
		}
		detail.Collections[i].Contributions = []model.ContributionInfo{}
		for ctRows.Next() {
			var ct model.ContributionInfo
			if err := ctRows.Scan(&ct.UserID, &ct.Paid, &ct.PaidAt); err != nil {
				ctRows.Close()
				return model.EventDetail{}, fmt.Errorf("scan contribution detail: %w", err)
			}
			detail.Collections[i].Contributions = append(detail.Collections[i].Contributions, ct)
		}
		ctRows.Close()
		if err := ctRows.Err(); err != nil {
			return model.EventDetail{}, err
		}
	}

	// 4. Polls with options and voter IDs
	pollRows, err := r.pool.Query(ctx,
		`SELECT id, question, created_by, created_at FROM polls WHERE event_id = $1 ORDER BY created_at`,
		eventID,
	)
	if err != nil {
		return model.EventDetail{}, fmt.Errorf("list polls detail: %w", err)
	}
	detail.Polls = []model.PollInfo{}
	for pollRows.Next() {
		var p model.PollInfo
		if err := pollRows.Scan(&p.ID, &p.Question, &p.CreatedBy, &p.CreatedAt); err != nil {
			pollRows.Close()
			return model.EventDetail{}, fmt.Errorf("scan poll detail: %w", err)
		}
		detail.Polls = append(detail.Polls, p)
	}
	pollRows.Close()
	if err := pollRows.Err(); err != nil {
		return model.EventDetail{}, err
	}
	for i, poll := range detail.Polls {
		optRows, err := r.pool.Query(ctx,
			`SELECT po.id, po.label FROM poll_options po WHERE po.poll_id = $1 ORDER BY po.id`,
			poll.ID,
		)
		if err != nil {
			return model.EventDetail{}, fmt.Errorf("list poll options detail: %w", err)
		}
		detail.Polls[i].Options = []model.PollOptionInfo{}
		for optRows.Next() {
			var opt model.PollOptionInfo
			if err := optRows.Scan(&opt.ID, &opt.Label); err != nil {
				optRows.Close()
				return model.EventDetail{}, fmt.Errorf("scan poll option detail: %w", err)
			}
			detail.Polls[i].Options = append(detail.Polls[i].Options, opt)
		}
		optRows.Close()
		if err := optRows.Err(); err != nil {
			return model.EventDetail{}, err
		}
		for j, opt := range detail.Polls[i].Options {
			voteRows, err := r.pool.Query(ctx,
				`SELECT user_id FROM poll_votes WHERE poll_option_id = $1`,
				opt.ID,
			)
			if err != nil {
				return model.EventDetail{}, fmt.Errorf("list poll votes detail: %w", err)
			}
			detail.Polls[i].Options[j].Votes = []uuid.UUID{}
			for voteRows.Next() {
				var voterID uuid.UUID
				if err := voteRows.Scan(&voterID); err != nil {
					voteRows.Close()
					return model.EventDetail{}, fmt.Errorf("scan poll vote detail: %w", err)
				}
				detail.Polls[i].Options[j].Votes = append(detail.Polls[i].Options[j].Votes, voterID)
			}
			voteRows.Close()
			if err := voteRows.Err(); err != nil {
				return model.EventDetail{}, err
			}
		}
	}

	// 5. Items with assigned_to user info
	itemRows, err := r.pool.Query(ctx,
		`SELECT i.id, i.name, i.assigned_to, u.name, u.email
		 FROM items i
		 LEFT JOIN users u ON u.id = i.assigned_to
		 WHERE i.event_id = $1 ORDER BY i.id`,
		eventID,
	)
	if err != nil {
		return model.EventDetail{}, fmt.Errorf("list items detail: %w", err)
	}
	detail.Items = []model.ItemInfo{}
	for itemRows.Next() {
		var item model.ItemInfo
		var assignedID *uuid.UUID
		var assignedName, assignedEmail *string
		if err := itemRows.Scan(&item.ID, &item.Name, &assignedID, &assignedName, &assignedEmail); err != nil {
			itemRows.Close()
			return model.EventDetail{}, fmt.Errorf("scan item detail: %w", err)
		}
		if assignedID != nil {
			item.AssignedTo = &model.UserInfo{
				ID:    *assignedID,
				Name:  *assignedName,
				Email: *assignedEmail,
			}
		}
		detail.Items = append(detail.Items, item)
	}
	itemRows.Close()
	if err := itemRows.Err(); err != nil {
		return model.EventDetail{}, err
	}

	// 6. Carpools with driver info and passengers
	cpRows, err := r.pool.Query(ctx,
		`SELECT c.id, c.driver_id, u.name, u.email, c.seats_available, c.departure_point
		 FROM carpools c
		 JOIN users u ON u.id = c.driver_id
		 WHERE c.event_id = $1 ORDER BY c.id`,
		eventID,
	)
	if err != nil {
		return model.EventDetail{}, fmt.Errorf("list carpools detail: %w", err)
	}
	detail.Carpools = []model.CarpoolInfo{}
	for cpRows.Next() {
		var cp model.CarpoolInfo
		if err := cpRows.Scan(&cp.ID, &cp.Driver.ID, &cp.Driver.Name, &cp.Driver.Email, &cp.SeatsAvailable, &cp.DeparturePoint); err != nil {
			cpRows.Close()
			return model.EventDetail{}, fmt.Errorf("scan carpool detail: %w", err)
		}
		detail.Carpools = append(detail.Carpools, cp)
	}
	cpRows.Close()
	if err := cpRows.Err(); err != nil {
		return model.EventDetail{}, err
	}
	for i, cp := range detail.Carpools {
		passRows, err := r.pool.Query(ctx,
			`SELECT u.id, u.name, u.email FROM carpool_passengers cp JOIN users u ON u.id = cp.user_id WHERE cp.carpool_id = $1`,
			cp.ID,
		)
		if err != nil {
			return model.EventDetail{}, fmt.Errorf("list carpool passengers detail: %w", err)
		}
		detail.Carpools[i].Passengers = []model.UserInfo{}
		for passRows.Next() {
			var passenger model.UserInfo
			if err := passRows.Scan(&passenger.ID, &passenger.Name, &passenger.Email); err != nil {
				passRows.Close()
				return model.EventDetail{}, fmt.Errorf("scan carpool passenger detail: %w", err)
			}
			detail.Carpools[i].Passengers = append(detail.Carpools[i].Passengers, passenger)
		}
		passRows.Close()
		if err := passRows.Err(); err != nil {
			return model.EventDetail{}, err
		}
	}

	// 7. Change log with changedBy user info
	clRows, err := r.pool.Query(ctx,
		`SELECT cl.id, cl.changed_by, u.name, u.email, cl.field_name, cl.old_value, cl.new_value, cl.changed_at
		 FROM event_change_logs cl
		 JOIN users u ON u.id = cl.changed_by
		 WHERE cl.event_id = $1 ORDER BY cl.changed_at`,
		eventID,
	)
	if err != nil {
		return model.EventDetail{}, fmt.Errorf("list change logs detail: %w", err)
	}
	detail.ChangeLog = []model.ChangeLogInfo{}
	for clRows.Next() {
		var cl model.ChangeLogInfo
		if err := clRows.Scan(&cl.ID, &cl.ChangedBy.ID, &cl.ChangedBy.Name, &cl.ChangedBy.Email, &cl.FieldName, &cl.OldValue, &cl.NewValue, &cl.ChangedAt); err != nil {
			clRows.Close()
			return model.EventDetail{}, fmt.Errorf("scan change log detail: %w", err)
		}
		detail.ChangeLog = append(detail.ChangeLog, cl)
	}
	clRows.Close()
	if err := clRows.Err(); err != nil {
		return model.EventDetail{}, err
	}

	return detail, nil
}

// ListForUserEnriched lists events with organizer info and participants for a given user.
func (r *EventRepository) ListForUserEnriched(ctx context.Context, userID uuid.UUID) ([]model.EventListItem, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT DISTINCT e.id, e.title, e.description, e.date_start, e.date_end, e.location,
		        e.organizer_id, ou.name, ou.email,
		        e.invite_token, e.created_at,
		        COALESCE(ep2.status, '') AS my_status
		 FROM events e
		 JOIN users ou ON ou.id = e.organizer_id
		 LEFT JOIN event_participants ep ON ep.event_id = e.id AND ep.user_id = $1
		 LEFT JOIN event_participants ep2 ON ep2.event_id = e.id AND ep2.user_id = $1
		 WHERE e.organizer_id = $1 OR ep.user_id = $1
		 ORDER BY e.date_start`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("list events enriched: %w", err)
	}
	defer rows.Close()

	var events []model.EventListItem
	for rows.Next() {
		var e model.EventListItem
		if err := rows.Scan(
			&e.ID, &e.Title, &e.Description, &e.DateStart, &e.DateEnd, &e.Location,
			&e.Organizer.ID, &e.Organizer.Name, &e.Organizer.Email,
			&e.InviteToken, &e.CreatedAt, &e.MyStatus,
		); err != nil {
			return nil, fmt.Errorf("scan event list item: %w", err)
		}
		events = append(events, e)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Load participants for each event
	for i, e := range events {
		pRows, err := r.pool.Query(ctx,
			`SELECT ep.id, ep.user_id, u.name, u.email, ep.status
			 FROM event_participants ep
			 JOIN users u ON u.id = ep.user_id
			 WHERE ep.event_id = $1`,
			e.ID,
		)
		if err != nil {
			return nil, fmt.Errorf("list participants for event list: %w", err)
		}
		events[i].Participants = []model.ParticipantInfo{}
		for pRows.Next() {
			var p model.ParticipantInfo
			if err := pRows.Scan(&p.ID, &p.User.ID, &p.User.Name, &p.User.Email, &p.Status); err != nil {
				pRows.Close()
				return nil, fmt.Errorf("scan participant list item: %w", err)
			}
			events[i].Participants = append(events[i].Participants, p)
		}
		pRows.Close()
		if err := pRows.Err(); err != nil {
			return nil, err
		}
	}

	return events, nil
}

// IsParticipant checks whether the user is organizer OR has a participant record (any status).
func (r *EventRepository) IsParticipant(ctx context.Context, eventID, userID uuid.UUID) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		`SELECT EXISTS(
			SELECT 1 FROM events WHERE id=$1 AND organizer_id=$2
			UNION ALL
			SELECT 1 FROM event_participants WHERE event_id=$1 AND user_id=$2
		)`,
		eventID, userID,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("is participant: %w", err)
	}
	return exists, nil
}

// IsConfirmedParticipant checks if user has confirmed status or is organizer.
func (r *EventRepository) IsConfirmedParticipant(ctx context.Context, eventID, userID uuid.UUID) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		`SELECT EXISTS(
			SELECT 1 FROM events WHERE id=$1 AND organizer_id=$2
			UNION ALL
			SELECT 1 FROM event_participants WHERE event_id=$1 AND user_id=$2 AND status='confirmed'
		)`,
		eventID, userID,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("is confirmed participant: %w", err)
	}
	return exists, nil
}

