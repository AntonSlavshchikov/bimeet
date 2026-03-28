package notificationhandler

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"meetup/internal/handler/response"
	"meetup/internal/middleware"
	"meetup/internal/model"
)

type Handler struct {
	svc NotificationService
}

func New(svc NotificationService) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	notifications, err := h.svc.List(r.Context(), userID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to list notifications")
		return
	}
	if notifications == nil {
		notifications = []model.Notification{}
	}
	response.JSON(w, http.StatusOK, notifications)
}

func (h *Handler) MarkRead(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	notifID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid notification id")
		return
	}

	n, err := h.svc.MarkRead(r.Context(), notifID, userID)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			response.Error(w, http.StatusForbidden, "forbidden")
			return
		}
		if strings.Contains(msg, "not found") {
			response.Error(w, http.StatusNotFound, "notification not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "failed to mark notification as read")
		return
	}

	response.JSON(w, http.StatusOK, n)
}
