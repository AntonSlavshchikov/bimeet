package notificationhandler

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"bimeet/internal/handler/response"
	"bimeet/internal/middleware"
	"bimeet/internal/model"
)

type Handler struct {
	svc NotificationService
}

func New(svc NotificationService) *Handler {
	return &Handler{svc: svc}
}

// @Summary List notifications
// @Tags notifications
// @Produce json
// @Security BearerAuth
// @Success 200 {array} model.Notification
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /notifications [get]
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

// @Summary Mark a notification as read
// @Tags notifications
// @Produce json
// @Security BearerAuth
// @Param id path string true "Notification ID"
// @Success 200 {object} model.Notification
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /notifications/{id}/read [patch]
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

// @Summary Mark all notifications as read
// @Tags notifications
// @Security BearerAuth
// @Success 204 "No Content"
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /notifications/read-all [post]
func (h *Handler) MarkAllRead(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	if err := h.svc.MarkAllRead(r.Context(), userID); err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to mark all notifications as read")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// @Summary Delete a notification
// @Tags notifications
// @Security BearerAuth
// @Param id path string true "Notification ID"
// @Success 204 "No Content"
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /notifications/{id} [delete]
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
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

	if err := h.svc.Delete(r.Context(), notifID, userID); err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			response.Error(w, http.StatusForbidden, "forbidden")
			return
		}
		if strings.Contains(msg, "not found") {
			response.Error(w, http.StatusNotFound, "notification not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "failed to delete notification")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// @Summary Delete all notifications
// @Tags notifications
// @Security BearerAuth
// @Success 204 "No Content"
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /notifications [delete]
func (h *Handler) DeleteAll(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	if err := h.svc.DeleteAll(r.Context(), userID); err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to delete all notifications")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
