// Package pushsvc sends Web Push (VAPID) notifications to users' subscribed
// browsers/PWAs, so notifications arrive even when the app is closed.
package pushsvc

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"

	"github.com/google/uuid"

	webpush "github.com/SherClockHolmes/webpush-go"

	"bimeet/internal/model"
)

// Config holds VAPID credentials. When PublicKey/PrivateKey are empty, the
// service is disabled and all sends are no-ops.
type Config struct {
	PublicKey  string
	PrivateKey string
	Subject    string
}

type Service struct {
	repo SubscriptionRepo
	cfg  Config
}

func New(repo SubscriptionRepo, cfg Config) *Service {
	return &Service{repo: repo, cfg: cfg}
}

// Enabled reports whether VAPID keys are configured.
func (s *Service) Enabled() bool {
	return s.cfg.PublicKey != "" && s.cfg.PrivateKey != ""
}

// PublicKey returns the VAPID public key for the frontend.
func (s *Service) PublicKey() string {
	return s.cfg.PublicKey
}

func (s *Service) Subscribe(ctx context.Context, userID uuid.UUID, req model.PushSubscribeRequest, userAgent string) error {
	return s.repo.Upsert(ctx, userID, req.Endpoint, req.Keys.P256dh, req.Keys.Auth, userAgent)
}

func (s *Service) Unsubscribe(ctx context.Context, endpoint string) error {
	return s.repo.DeleteByEndpoint(ctx, endpoint)
}

// payload is the JSON body the service worker receives in its `push` handler.
type payload struct {
	Title string `json:"title"`
	Body  string `json:"body"`
	URL   string `json:"url,omitempty"`
	Tag   string `json:"tag,omitempty"`
}

// SendToUser delivers a push to every subscription of the user. Dead
// subscriptions (404/410 from the push service) are pruned. Safe to call in a
// goroutine; it logs errors and never panics.
func (s *Service) SendToUser(ctx context.Context, userID uuid.UUID, title, body, url, tag string) {
	if !s.Enabled() {
		return
	}

	subs, err := s.repo.ListByUser(ctx, userID)
	if err != nil {
		log.Printf("push: list subscriptions for %s: %v", userID, err)
		return
	}
	if len(subs) == 0 {
		return
	}

	for _, sub := range subs {
		if err := s.sendOne(ctx, sub, payload{Title: title, Body: body, URL: url, Tag: tag}); err != nil {
			log.Printf("push: send to %s: %v", userID, err)
		}
	}
}

// Test sends a push to the caller's own subscriptions synchronously and returns
// the first error (including the push service's status/body). Useful for
// debugging delivery from the UI.
func (s *Service) Test(ctx context.Context, userID uuid.UUID) error {
	if !s.Enabled() {
		return fmt.Errorf("push disabled: VAPID keys not configured")
	}
	subs, err := s.repo.ListByUser(ctx, userID)
	if err != nil {
		return err
	}
	if len(subs) == 0 {
		return fmt.Errorf("no subscriptions for this account on any device")
	}

	var firstErr error
	var ok bool
	for _, sub := range subs {
		if err := s.sendOne(ctx, sub, payload{
			Title: "Bimeet",
			Body:  "Тестовое push-уведомление ✅",
			URL:   "/events",
			Tag:   "push-test",
		}); err != nil {
			if firstErr == nil {
				firstErr = err
			}
		} else {
			ok = true
		}
	}
	// Success if at least one device accepted it (ignore pruned/dead ones).
	if ok {
		return nil
	}
	return firstErr
}

// sendOne delivers a single payload to one subscription. Returns an error for
// transport failures and non-2xx responses; prunes dead (404/410) subscriptions.
func (s *Service) sendOne(ctx context.Context, sub model.PushSubscription, p payload) error {
	data, err := json.Marshal(p)
	if err != nil {
		return fmt.Errorf("marshal payload: %w", err)
	}

	resp, err := webpush.SendNotification(data, &webpush.Subscription{
		Endpoint: sub.Endpoint,
		Keys:     webpush.Keys{P256dh: sub.P256dh, Auth: sub.Auth},
	}, &webpush.Options{
		// webpush-go сам добавляет "mailto:" к не-https subscriber, поэтому
		// передаём голый email/URL — иначе выйдет "mailto:mailto:..." → BadJwtToken.
		Subscriber:      strings.TrimPrefix(s.cfg.Subject, "mailto:"),
		VAPIDPublicKey:  s.cfg.PublicKey,
		VAPIDPrivateKey: s.cfg.PrivateKey,
		TTL:             60,
	})
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// Prune subscriptions the push service no longer recognises.
	if resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusGone {
		if delErr := s.repo.DeleteByEndpoint(ctx, sub.Endpoint); delErr != nil {
			log.Printf("push: prune dead subscription: %v", delErr)
		}
		return fmt.Errorf("subscription expired (%d), pruned", resp.StatusCode)
	}
	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return fmt.Errorf("push service returned %d: %s", resp.StatusCode, string(b))
	}
	return nil
}
