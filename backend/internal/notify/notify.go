// Package notify decorates the notification repository so that every persisted
// in-app notification also fans out as a Web Push. This is the single hook point
// through which all notifications already flow (event/collection services and the
// reminder runner), so push works everywhere without touching those callers.
package notify

import (
	"context"

	"github.com/google/uuid"

	"bimeet/internal/model"
)

// Creator is the subset of the notification repository the consumers rely on.
// CountUnread feeds the PWA icon badge carried in the push payload.
type Creator interface {
	Create(ctx context.Context, userID uuid.UUID, eventID *uuid.UUID, notifType, message string) (model.Notification, error)
	CountUnread(ctx context.Context, userID uuid.UUID) (int, error)
}

// Pusher dispatches a web push to all of a user's subscriptions.
type Pusher interface {
	SendToUser(ctx context.Context, userID uuid.UUID, title, body, url, tag string, badge int)
}

// Repo wraps a Creator and pushes after each successful Create.
type Repo struct {
	inner Creator
	push  Pusher
}

func New(inner Creator, push Pusher) *Repo {
	return &Repo{inner: inner, push: push}
}

func (r *Repo) Create(ctx context.Context, userID uuid.UUID, eventID *uuid.UUID, notifType, message string) (model.Notification, error) {
	n, err := r.inner.Create(ctx, userID, eventID, notifType, message)
	if err != nil {
		return n, err
	}
	// Бейдж на иконке PWA = число непрочитанных. Считаем здесь, до ухода в
	// goroutine; при ошибке шлём 0 (badge,omitempty → SW не тронет бейдж).
	badge, err := r.inner.CountUnread(ctx, userID)
	if err != nil {
		badge = 0
	}
	// Fire-and-forget: a fresh context so it isn't cancelled with the request.
	go r.push.SendToUser(context.Background(), userID, "Bimeet", message, href(notifType, eventID), n.ID.String(), badge)
	return n, nil
}

// href mirrors frontend entities/notification/lib/href.ts so the push opens the
// same screen the in-app notification links to.
func href(notifType string, eventID *uuid.UUID) string {
	if eventID == nil {
		return ""
	}
	if notifType == "collection_contribution_pending" {
		return "/events/" + eventID.String() + "?tab=collections"
	}
	if notifType == "chat_message" {
		return "/events/" + eventID.String() + "?tab=chat"
	}
	return "/events/" + eventID.String()
}
