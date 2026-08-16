package realtime

import (
	"encoding/json"

	"github.com/google/uuid"

	"bimeet/internal/model"
)

// activityPing is the /api/chats/stream payload — deliberately just a
// pointer telling the client which chat changed, not the message itself.
// The client already has an authenticated, per-user GET /api/chats to fetch
// the enriched (decrypted, unread-counted) summary; duplicating that here
// would mean decrypting message bodies for every member on every send.
type activityPing struct {
	EventID uuid.UUID `json:"event_id"`
}

// PublishMessage pushes a new chat message to everyone subscribed to that
// event's live feed (GET /api/events/{id}/stream).
func (h *Hub) PublishMessage(eventID uuid.UUID, msg model.Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}
	h.Publish(eventKey(eventID), Envelope{Type: "message", Data: data})
}

// PublishActivity notifies every given user's chat-list stream
// (GET /api/chats/stream) that eventID has new activity, so the client can
// refetch the chat list and update badges/ordering.
func (h *Hub) PublishActivity(userIDs []uuid.UUID, eventID uuid.UUID) {
	data, err := json.Marshal(activityPing{EventID: eventID})
	if err != nil {
		return
	}
	for _, uid := range userIDs {
		h.Publish(userKey(uid), Envelope{Type: "activity", Data: data})
	}
}

// SubscribeEvent subscribes to one event's live message feed.
func (h *Hub) SubscribeEvent(eventID uuid.UUID) (<-chan Envelope, func()) {
	return h.Subscribe(eventKey(eventID))
}

// SubscribeUser subscribes to one user's cross-event activity feed.
func (h *Hub) SubscribeUser(userID uuid.UUID) (<-chan Envelope, func()) {
	return h.Subscribe(userKey(userID))
}
