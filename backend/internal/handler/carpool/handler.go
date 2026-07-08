package carpoolhandler

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
	svc CarpoolService
}

func New(svc CarpoolService) *Handler {
	return &Handler{svc: svc}
}

// @Summary List event carpools
// @Tags carpools
// @Produce json
// @Security BearerAuth
// @Param id path string true "Event ID"
// @Success 200 {array} model.Carpool
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /events/{id}/carpools [get]
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
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

	carpools, err := h.svc.List(r.Context(), eventID, userID)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			response.Error(w, http.StatusForbidden, "forbidden")
			return
		}
		response.Error(w, http.StatusInternalServerError, "failed to list carpools")
		return
	}
	if carpools == nil {
		carpools = []model.Carpool{}
	}
	response.JSON(w, http.StatusOK, carpools)
}

// @Summary Create an event carpool
// @Tags carpools
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Event ID"
// @Param request body model.CreateCarpoolRequest true "Carpool payload"
// @Success 201 {object} model.Carpool
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Router /events/{id}/carpools [post]
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
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

	var req model.CreateCarpoolRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	carpool, err := h.svc.Create(r.Context(), eventID, userID, req)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			response.Error(w, http.StatusForbidden, "forbidden")
			return
		}
		response.Error(w, http.StatusBadRequest, msg)
		return
	}

	response.JSON(w, http.StatusCreated, carpool)
}

// @Summary Join an event carpool
// @Tags carpools
// @Security BearerAuth
// @Param id path string true "Event ID"
// @Param carpoolId path string true "Carpool ID"
// @Success 204 "No Content"
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 409 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /events/{id}/carpools/{carpoolId}/join [post]
func (h *Handler) Join(w http.ResponseWriter, r *http.Request) {
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

	carpoolID, err := uuid.Parse(chi.URLParam(r, "carpoolId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid carpool id")
		return
	}

	if err := h.svc.Join(r.Context(), eventID, carpoolID, userID); err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			response.Error(w, http.StatusForbidden, "forbidden")
			return
		}
		if strings.Contains(msg, "not found") {
			response.Error(w, http.StatusNotFound, msg)
			return
		}
		if strings.Contains(msg, "full") || strings.Contains(msg, "already") || strings.Contains(msg, "driver") {
			response.Error(w, http.StatusConflict, msg)
			return
		}
		response.Error(w, http.StatusInternalServerError, "failed to join carpool")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
