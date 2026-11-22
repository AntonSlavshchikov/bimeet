package realtime

import (
	"encoding/json"

	"github.com/google/uuid"

	"bimeet/internal/model"
)

// PublishUser pushes one envelope to every open stream of a single user
// (all of their tabs). Used for 1:1 call signaling.
func (h *Hub) PublishUser(userID uuid.UUID, env Envelope) {
	h.Publish(userKey(userID), env)
}

// IsUserOnline reports whether the user has at least one open personal
// stream (/api/chats/stream) in this process — i.e. can receive a call now.
func (h *Hub) IsUserOnline(userID uuid.UUID) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.subs[userKey(userID)]) > 0
}

// PublishCall delivers one call-signaling message to every tab of userID.
// The SSE event name is the signal type ("call.invite", "call.offer", …).
func (h *Hub) PublishCall(userID uuid.UUID, sig model.CallSignal) {
	data, err := json.Marshal(sig)
	if err != nil {
		return
	}
	h.PublishUser(userID, Envelope{Type: sig.Type, Data: data})
}
