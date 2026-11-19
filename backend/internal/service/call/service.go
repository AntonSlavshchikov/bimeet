// Package callsvc relays WebRTC signaling for 1:1 calls between two
// participants of the same event. The server never touches media and keeps
// no call state: it checks who may talk to whom, then forwards the message
// to the recipient's personal SSE stream. Audio/video flows browser to
// browser (or through coturn when a direct path is impossible).
package callsvc

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/google/uuid"

	"bimeet/internal/model"
)

// Signal types. The server only forwards them; the call state machine lives
// in the browser (features/call on the frontend).
const (
	TypeInvite      = "call.invite"
	TypeAccept      = "call.accept"
	TypeReject      = "call.reject"
	TypeCancel      = "call.cancel"
	TypeHangup      = "call.hangup"
	TypeOffer       = "call.offer"
	TypeAnswer      = "call.answer"
	TypeICE         = "call.ice"
	TypeUnavailable = "call.unavailable" // server → caller only
)

var clientTypes = map[string]bool{
	TypeInvite: true, TypeAccept: true, TypeReject: true, TypeCancel: true,
	TypeHangup: true, TypeOffer: true, TypeAnswer: true, TypeICE: true,
}

// echoTypes are also sent back to the sender's own tabs: when the callee
// answers in one tab, the other tabs that are still ringing stop.
var echoTypes = map[string]bool{TypeAccept: true, TypeReject: true}

var (
	ErrInvalid     = errors.New("invalid call signal")
	ErrForbidden   = errors.New("forbidden")
	ErrRateLimited = errors.New("too many call attempts")
)

// InviteInterval is the minimum gap between two call.invite from one user.
const InviteInterval = 5 * time.Second

type Service struct {
	events EventChecker
	users  UserLookup
	hub    Hub
	turn   TURNConfig
	now    func() time.Time

	mu         sync.Mutex
	lastInvite map[uuid.UUID]time.Time
}

func New(events EventChecker, users UserLookup, hub Hub, turn TURNConfig) *Service {
	return &Service{
		events:     events,
		users:      users,
		hub:        hub,
		turn:       turn,
		now:        time.Now,
		lastInvite: make(map[uuid.UUID]time.Time),
	}
}

// Signal validates one message from `from` and forwards it to the
// participant whose email is req.To.
func (s *Service) Signal(ctx context.Context, from uuid.UUID, req model.CallSignalRequest) error {
	if !clientTypes[req.Type] || req.CallID == uuid.Nil || req.EventID == uuid.Nil || req.To == "" {
		return ErrInvalid
	}

	sender, err := s.users.GetByID(ctx, from)
	if err != nil {
		return err
	}
	recipient, err := s.users.GetByEmail(ctx, req.To)
	if err != nil {
		// Unknown email: same answer as "not in this event", so the endpoint
		// can't be used to probe which emails are registered.
		return ErrForbidden
	}
	if recipient.ID == from {
		return ErrInvalid
	}

	for _, uid := range []uuid.UUID{from, recipient.ID} {
		ok, err := s.events.IsParticipant(ctx, req.EventID, uid)
		if err != nil {
			return err
		}
		if !ok {
			return ErrForbidden
		}
	}

	sig := model.CallSignal{
		Type:      req.Type,
		CallID:    req.CallID,
		FromEmail: sender.Email,
		FromName:  sender.Name,
		EventID:   req.EventID,
		Payload:   req.Payload,
	}

	if req.Type == TypeInvite {
		if !s.allowInvite(from) {
			return ErrRateLimited
		}
		if !s.hub.IsUserOnline(recipient.ID) {
			// Bounce back to the caller, "from" the person they tried to reach.
			sig.Type = TypeUnavailable
			sig.FromEmail, sig.FromName = recipient.Email, recipient.Name
			s.hub.PublishCall(from, sig)
			return nil
		}
	}

	s.hub.PublishCall(recipient.ID, sig)
	if echoTypes[req.Type] {
		s.hub.PublishCall(from, sig)
	}
	return nil
}

// allowInvite is a per-user in-memory limiter: one invite per InviteInterval.
// Fine for a single backend instance, like the realtime hub itself.
func (s *Service) allowInvite(userID uuid.UUID) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := s.now()
	if last, ok := s.lastInvite[userID]; ok && now.Sub(last) < InviteInterval {
		return false
	}
	s.lastInvite[userID] = now

	// Drop stale entries so the map can't grow without bound.
	if len(s.lastInvite) > 1000 {
		for id, t := range s.lastInvite {
			if now.Sub(t) >= InviteInterval {
				delete(s.lastInvite, id)
			}
		}
	}
	return true
}
