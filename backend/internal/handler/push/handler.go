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
// @Summary Get the public VAPID key
// @Tags push
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.VAPIDKeyResponse
// @Router /push/vapid-public-key [get]
func (h *Handler) VAPIDPublicKey(w http.ResponseWriter, r *http.Request) {
	response.JSON(w, http.StatusOK, map[string]string{"key": h.svc.PublicKey()})
}

// @Summary Subscribe to web push notifications
// @Tags push
// @Accept json
// @Security BearerAuth
// @Param request body model.PushSubscribeRequest true "Browser push subscription"
// @Success 204 "No Content"
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /push/subscribe [post]
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

// Test sends a push to the caller's own subscriptions (debugging aid).
// @Summary Send a test push notification
// @Tags push
// @Security BearerAuth
// @Success 204 "No Content"
// @Failure 401 {object} response.ErrorResponse
// @Failure 502 {object} response.ErrorResponse
// @Router /push/test [post]
func (h *Handler) Test(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	if err := h.svc.Test(r.Context(), userID); err != nil {
		response.Error(w, http.StatusBadGateway, err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// @Summary Unsubscribe from web push notifications
// @Tags push
// @Accept json
// @Security BearerAuth
// @Param request body model.PushUnsubscribeRequest true "Push endpoint to remove"
// @Success 204 "No Content"
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /push/unsubscribe [post]
func (h *Handler) Unsubscribe(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
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

	if err := h.svc.Unsubscribe(r.Context(), userID, req.Endpoint); err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to remove subscription")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
