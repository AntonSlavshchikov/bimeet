// Package streamhandler serves Server-Sent Events for the live chat feed
// and the cross-event chat-list activity ping. The frontend connects via
// fetch()+ReadableStream (not the native EventSource API) so it can send
// the normal Authorization: Bearer header — these routes sit behind the
// same auth middleware as the rest of the API, nothing SSE-specific.
package streamhandler

import (
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"bimeet/internal/handler/response"
	"bimeet/internal/middleware"
	"bimeet/internal/realtime"
)

// keepaliveInterval sends a comment line periodically so intermediary
// proxies/load balancers don't time out an otherwise-idle connection.
const keepaliveInterval = 25 * time.Second

type Handler struct {
	hub          Hub
	eventChecker EventChecker
}

func New(hub Hub, eventChecker EventChecker) *Handler {
	return &Handler{hub: hub, eventChecker: eventChecker}
}

// @Summary Stream live messages for one event
// @Tags chats
// @Security BearerAuth
// @Param id path string true "Event ID"
// @Produce text/event-stream
// @Success 200 {string} string "text/event-stream"
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Router /events/{id}/stream [get]
func (h *Handler) StreamEvent(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid event id")
		return
	}

	member, err := h.eventChecker.IsParticipant(r.Context(), eventID, userID)
	if err != nil || !member {
		response.Error(w, http.StatusForbidden, "forbidden")
		return
	}

	ch, unsubscribe := h.hub.SubscribeEvent(eventID)
	defer unsubscribe()
	serve(w, r, ch)
}

// @Summary Stream chat-list activity across all of the caller's events
// @Tags chats
// @Security BearerAuth
// @Produce text/event-stream
// @Success 200 {string} string "text/event-stream"
// @Failure 401 {object} response.ErrorResponse
// @Router /chats/stream [get]
func (h *Handler) StreamChats(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	ch, unsubscribe := h.hub.SubscribeUser(userID)
	defer unsubscribe()
	serve(w, r, ch)
}

func serve(w http.ResponseWriter, r *http.Request, ch <-chan realtime.Envelope) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		response.Error(w, http.StatusInternalServerError, "streaming unsupported")
		return
	}

	// The server's http.Server sets a global WriteTimeout covering the whole
	// response write — fine for ordinary requests, fatal for a stream meant
	// to stay open indefinitely. Lift it for this connection specifically.
	if err := http.NewResponseController(w).SetWriteDeadline(time.Time{}); err != nil {
		response.Error(w, http.StatusInternalServerError, "streaming unsupported")
		return
	}

	h := w.Header()
	h.Set("Content-Type", "text/event-stream")
	h.Set("Cache-Control", "no-cache")
	h.Set("Connection", "keep-alive")
	h.Set("X-Accel-Buffering", "no") // disable nginx response buffering
	w.WriteHeader(http.StatusOK)
	flusher.Flush()

	ticker := time.NewTicker(keepaliveInterval)
	defer ticker.Stop()

	for {
		select {
		case env, open := <-ch:
			if !open {
				return
			}
			fmt.Fprintf(w, "event: %s\ndata: %s\n\n", env.Type, env.Data)
			flusher.Flush()
		case <-ticker.C:
			fmt.Fprint(w, ": keepalive\n\n")
			flusher.Flush()
		case <-r.Context().Done():
			return
		}
	}
}
