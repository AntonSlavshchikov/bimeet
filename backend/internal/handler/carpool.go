package handler

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"meetup/internal/middleware"
	"meetup/internal/model"
	"meetup/internal/service"
)

type CarpoolHandler struct {
	carpoolService *service.CarpoolService
}

func NewCarpoolHandler(carpoolService *service.CarpoolService) *CarpoolHandler {
	return &CarpoolHandler{carpoolService: carpoolService}
}

func (h *CarpoolHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid event id")
		return
	}

	carpools, err := h.carpoolService.List(r.Context(), eventID, userID)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			Error(w, http.StatusForbidden, "forbidden")
			return
		}
		Error(w, http.StatusInternalServerError, "failed to list carpools")
		return
	}
	if carpools == nil {
		carpools = []model.Carpool{}
	}
	JSON(w, http.StatusOK, carpools)
}

func (h *CarpoolHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid event id")
		return
	}

	var req model.CreateCarpoolRequest
	if err := ParseJSON(r, &req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	carpool, err := h.carpoolService.Create(r.Context(), eventID, userID, req)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			Error(w, http.StatusForbidden, "forbidden")
			return
		}
		Error(w, http.StatusBadRequest, msg)
		return
	}

	JSON(w, http.StatusCreated, carpool)
}

func (h *CarpoolHandler) Join(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid event id")
		return
	}

	carpoolID, err := uuid.Parse(chi.URLParam(r, "carpoolId"))
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid carpool id")
		return
	}

	if err := h.carpoolService.Join(r.Context(), eventID, carpoolID, userID); err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			Error(w, http.StatusForbidden, "forbidden")
			return
		}
		if strings.Contains(msg, "not found") {
			Error(w, http.StatusNotFound, msg)
			return
		}
		if strings.Contains(msg, "full") || strings.Contains(msg, "already") || strings.Contains(msg, "driver") {
			Error(w, http.StatusConflict, msg)
			return
		}
		Error(w, http.StatusInternalServerError, "failed to join carpool")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
