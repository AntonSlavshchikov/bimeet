package reminder

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"bimeet/internal/observability"
)

type Runner struct {
	eventRepo        EventRepo
	notificationRepo NotificationRepo
	interval         time.Duration
}

func New(eventRepo EventRepo, notificationRepo NotificationRepo, interval time.Duration) *Runner {
	return &Runner{
		eventRepo:        eventRepo,
		notificationRepo: notificationRepo,
		interval:         interval,
	}
}

func (r *Runner) Start(ctx context.Context) {
	r.run(ctx)
	ticker := time.NewTicker(r.interval)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			r.run(ctx)
		case <-ctx.Done():
			return
		}
	}
}

func (r *Runner) run(ctx context.Context) {
	ctx, span := observability.Span(ctx, "reminder.run")
	defer span.End()

	events, err := r.eventRepo.ListForReminder(ctx)
	if err != nil {
		observability.FromContext(ctx).Error("reminder: list events", "error", err)
		return
	}

	for _, e := range events {
		recipients := uniqueRecipients(e.ParticipantIDs, e.OrganizerID)

		if e.Needs3d {
			msg := fmt.Sprintf("Встреча «%s» заканчивается через 3 дня", e.Title)
			r.sendToAll(ctx, recipients, e.ID, "event_reminder_3d", msg)
			if err := r.eventRepo.MarkReminder3dSent(ctx, e.ID); err != nil {
				observability.FromContext(ctx).Error("reminder: mark 3d sent", "event_id", e.ID, "error", err)
			}
		}

		if e.Needs1d {
			msg := fmt.Sprintf("Встреча «%s» заканчивается завтра", e.Title)
			r.sendToAll(ctx, recipients, e.ID, "event_reminder_1d", msg)
			if err := r.eventRepo.MarkReminder1dSent(ctx, e.ID); err != nil {
				observability.FromContext(ctx).Error("reminder: mark 1d sent", "event_id", e.ID, "error", err)
			}
		}
	}
}

func (r *Runner) sendToAll(ctx context.Context, recipients []uuid.UUID, eventID uuid.UUID, notifType, msg string) {
	for _, uid := range recipients {
		if _, err := r.notificationRepo.Create(ctx, uid, &eventID, notifType, msg); err != nil {
			observability.FromContext(ctx).Error("reminder: create notification", "user_id", uid, "error", err)
		}
	}
}

func uniqueRecipients(participants []uuid.UUID, organizer uuid.UUID) []uuid.UUID {
	seen := make(map[uuid.UUID]struct{}, len(participants)+1)
	result := make([]uuid.UUID, 0, len(participants)+1)
	for _, id := range append(participants, organizer) {
		if _, ok := seen[id]; !ok {
			seen[id] = struct{}{}
			result = append(result, id)
		}
	}
	return result
}
