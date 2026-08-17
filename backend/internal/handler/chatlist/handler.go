package chatlisthandler

import (
	"net/http"

	"bimeet/internal/handler/response"
	"bimeet/internal/middleware"
	"bimeet/internal/model"
)

type Handler struct {
	svc ChatListService
}

func New(svc ChatListService) *Handler {
	return &Handler{svc: svc}
}

// @Summary List all chats (events the caller organizes or participates in)
// @Tags chats
// @Produce json
// @Security BearerAuth
// @Success 200 {array} model.ChatSummary
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /chats [get]
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	chats, err := h.svc.List(r.Context(), userID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to list chats")
		return
	}
	if chats == nil {
		chats = []model.ChatSummary{}
	}
	response.JSON(w, http.StatusOK, chats)
}
