// Package realtime is an in-process pub/sub hub for Server-Sent Events. It
// replaces the chat feed's 4s poll: a message POST publishes into the hub,
// subscribers (SSE handlers) get it pushed immediately.
//
// Single-instance only: subscribers only see events published within the
// same process. Fine while the server runs as one instance; scaling to
// several would need a shared broker (e.g. Postgres LISTEN/NOTIFY) fanning
// into each instance's hub instead.
package realtime

import (
	"sync"

	"github.com/google/uuid"
)

// Envelope is one SSE message: Type names the event (see event.go / chat.go
// for the concrete payloads), Data is its pre-encoded JSON body.
type Envelope struct {
	Type string
	Data []byte
}

type Hub struct {
	mu   sync.RWMutex
	subs map[string]map[chan Envelope]struct{}
}

func NewHub() *Hub {
	return &Hub{subs: make(map[string]map[chan Envelope]struct{})}
}

// Subscribe registers a new channel under key and returns it along with an
// unsubscribe func the caller must run (typically deferred) when done.
func (h *Hub) Subscribe(key string) (<-chan Envelope, func()) {
	ch := make(chan Envelope, 16)

	h.mu.Lock()
	if h.subs[key] == nil {
		h.subs[key] = make(map[chan Envelope]struct{})
	}
	h.subs[key][ch] = struct{}{}
	h.mu.Unlock()

	unsubscribe := func() {
		h.mu.Lock()
		delete(h.subs[key], ch)
		if len(h.subs[key]) == 0 {
			delete(h.subs, key)
		}
		h.mu.Unlock()
		close(ch)
	}
	return ch, unsubscribe
}

// Publish fans an envelope out to every subscriber of key. Non-blocking: a
// subscriber whose buffer is full (a stalled connection) drops the message
// rather than stalling the publisher — the next SSE reconnect resyncs via a
// normal GET, so a dropped push is not data loss.
func (h *Hub) Publish(key string, env Envelope) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for ch := range h.subs[key] {
		select {
		case ch <- env:
		default:
		}
	}
}

func eventKey(eventID uuid.UUID) string { return "event:" + eventID.String() }
func userKey(userID uuid.UUID) string   { return "user:" + userID.String() }
