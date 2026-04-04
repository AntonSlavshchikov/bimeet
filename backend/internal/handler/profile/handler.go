package profilehandler

import (
	"net/http"
	"strings"

	"meetup/internal/handler/response"
	"meetup/internal/middleware"
	"meetup/internal/model"
)

type Handler struct {
	svc ProfileService
}

func New(svc ProfileService) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) GetMe(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	user, err := h.svc.GetMe(r.Context(), userID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to get profile")
		return
	}

	response.JSON(w, http.StatusOK, user)
}

func (h *Handler) UpdateMe(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req model.UpdateProfileRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		response.Error(w, http.StatusBadRequest, "name is required")
		return
	}

	user, err := h.svc.UpdateMe(r.Context(), userID, req)
	if err != nil {
		if strings.Contains(err.Error(), "invalid birth_date") {
			response.Error(w, http.StatusBadRequest, err.Error())
			return
		}
		response.Error(w, http.StatusInternalServerError, "failed to update profile")
		return
	}

	response.JSON(w, http.StatusOK, user)
}

func (h *Handler) GetStats(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	stats, err := h.svc.GetStats(r.Context(), userID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to get stats")
		return
	}

	response.JSON(w, http.StatusOK, stats)
}
