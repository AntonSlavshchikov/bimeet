// Package pushsvc sends Web Push (VAPID) notifications to users' subscribed
// browsers/PWAs, so notifications arrive even when the app is closed.
package pushsvc

import (
	"context"
	"encoding/json"
	"log"
	"net/http"

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

	data, err := json.Marshal(payload{Title: title, Body: body, URL: url, Tag: tag})
	if err != nil {
		log.Printf("push: marshal payload: %v", err)
		return
	}

	for _, sub := range subs {
		resp, err := webpush.SendNotification(data, &webpush.Subscription{
			Endpoint: sub.Endpoint,
			Keys:     webpush.Keys{P256dh: sub.P256dh, Auth: sub.Auth},
		}, &webpush.Options{
			Subscriber:      s.cfg.Subject,
			VAPIDPublicKey:  s.cfg.PublicKey,
			VAPIDPrivateKey: s.cfg.PrivateKey,
			TTL:             60,
		})
		if err != nil {
			log.Printf("push: send to %s: %v", userID, err)
			continue
		}
		// Prune subscriptions the push service no longer recognises.
		if resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusGone {
			if err := s.repo.DeleteByEndpoint(ctx, sub.Endpoint); err != nil {
				log.Printf("push: prune dead subscription: %v", err)
			}
		}
		resp.Body.Close()
	}
}
