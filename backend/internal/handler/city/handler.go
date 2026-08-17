package cityhandler

import (
	"net/http"

	"bimeet/internal/handler/response"
	"bimeet/internal/middleware"
	"bimeet/internal/model"
)

type Handler struct {
	svc CityService
}

func New(svc CityService) *Handler {
	return &Handler{svc: svc}
}

// List returns the active Russian city catalog.
// @Summary List active Russian cities
// @Tags cities
// @Produce json
// @Security BearerAuth
// @Success 200 {array} model.City
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /cities [get]
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	if _, ok := middleware.UserIDFromCtx(r.Context()); !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	cities, err := h.svc.List(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to list cities")
		return
	}
	if cities == nil {
		cities = []model.City{}
	}
	response.JSON(w, http.StatusOK, cities)
}
