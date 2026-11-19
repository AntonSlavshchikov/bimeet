// Package callhandler exposes 1:1 call signaling over plain HTTP.
// Browser → server: POST /api/calls/signal. Server → browser: the caller's
// existing personal SSE stream (/api/chats/stream), with event names
// "call.*". No WebSocket: SSE already gives the push half.
package callhandler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/google/uuid"

	"bimeet/internal/handler/response"
	"bimeet/internal/middleware"
	"bimeet/internal/model"
	callsvc "bimeet/internal/service/call"
)

// maxSignalBytes caps one signal body. An SDP offer is a few KB.
const maxSignalBytes = 64 << 10

type CallService interface {
	Signal(ctx context.Context, from uuid.UUID, req model.CallSignalRequest) error
	ICEServers(userID uuid.UUID) model.ICEServersResponse
}

type Handler struct {
	svc CallService
}

func New(svc CallService) *Handler {
	return &Handler{svc: svc}
}

// @Summary Send a call signaling message to another event participant
// @Tags calls
// @Accept json
// @Security BearerAuth
// @Param request body model.CallSignalRequest true "Signal"
// @Success 204
// @Failure 400 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 429 {object} response.ErrorResponse
// @Router /calls/signal [post]
func (h *Handler) Signal(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req model.CallSignalRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxSignalBytes)).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	switch err := h.svc.Signal(r.Context(), userID, req); {
	case err == nil:
		w.WriteHeader(http.StatusNoContent)
	case errors.Is(err, callsvc.ErrInvalid):
		response.Error(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, callsvc.ErrForbidden):
		response.Error(w, http.StatusForbidden, "forbidden")
	case errors.Is(err, callsvc.ErrRateLimited):
		response.Error(w, http.StatusTooManyRequests, err.Error())
	default:
		response.Error(w, http.StatusInternalServerError, "internal error")
	}
}

// @Summary ICE servers (STUN + short-lived TURN credentials) for WebRTC
// @Tags calls
// @Produce json
// @Security BearerAuth
// @Success 200 {object} model.ICEServersResponse
// @Failure 401 {object} response.ErrorResponse
// @Router /calls/ice-servers [get]
func (h *Handler) ICEServers(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	response.JSON(w, http.StatusOK, h.svc.ICEServers(userID))
}
