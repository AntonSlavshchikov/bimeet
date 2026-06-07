package notificationhandler

import (
	"context"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"bimeet-teams/internal/handler/response"
	"bimeet-teams/internal/middleware"
	"bimeet-teams/internal/model"
)

type NotificationService interface {
	List(ctx context.Context, userID uuid.UUID) ([]model.Notification, error)
	MarkRead(ctx context.Context, userID, id uuid.UUID) error
	MarkAllRead(ctx context.Context, userID uuid.UUID) error
}

type Handler struct {
	svc NotificationService
}

func New(svc NotificationService) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromCtx(r.Context())
	items, err := h.svc.List(r.Context(), userID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to list notifications")
		return
	}
	response.JSON(w, http.StatusOK, items)
}

func (h *Handler) MarkRead(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromCtx(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	if err := h.svc.MarkRead(r.Context(), userID, id); err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to mark read")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) MarkAllRead(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromCtx(r.Context())
	if err := h.svc.MarkAllRead(r.Context(), userID); err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to mark all read")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
