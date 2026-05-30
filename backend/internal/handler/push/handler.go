package pushhandler

import (
	"net/http"

	"bimeet/internal/handler/response"
	"bimeet/internal/middleware"
	"bimeet/internal/model"
)

type Handler struct {
	svc PushService
}

func New(svc PushService) *Handler {
	return &Handler{svc: svc}
}

// VAPIDPublicKey returns the public VAPID key the browser needs to subscribe.
func (h *Handler) VAPIDPublicKey(w http.ResponseWriter, r *http.Request) {
	response.JSON(w, http.StatusOK, map[string]string{"key": h.svc.PublicKey()})
}

func (h *Handler) Subscribe(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req model.PushSubscribeRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Endpoint == "" || req.Keys.P256dh == "" || req.Keys.Auth == "" {
		response.Error(w, http.StatusBadRequest, "invalid subscription")
		return
	}

	if err := h.svc.Subscribe(r.Context(), userID, req, r.UserAgent()); err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to save subscription")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) Unsubscribe(w http.ResponseWriter, r *http.Request) {
	if _, ok := middleware.UserIDFromCtx(r.Context()); !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req model.PushUnsubscribeRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Endpoint == "" {
		response.Error(w, http.StatusBadRequest, "endpoint required")
		return
	}

	if err := h.svc.Unsubscribe(r.Context(), req.Endpoint); err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to remove subscription")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
