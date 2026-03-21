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

type EventLinkHandler struct {
	linkService *service.EventLinkService
}

func NewEventLinkHandler(linkService *service.EventLinkService) *EventLinkHandler {
	return &EventLinkHandler{linkService: linkService}
}

func (h *EventLinkHandler) List(w http.ResponseWriter, r *http.Request) {
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

	links, err := h.linkService.List(r.Context(), eventID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "forbidden") {
			Error(w, http.StatusForbidden, "forbidden")
			return
		}
		Error(w, http.StatusInternalServerError, "failed to list links")
		return
	}

	JSON(w, http.StatusOK, links)
}

func (h *EventLinkHandler) Create(w http.ResponseWriter, r *http.Request) {
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

	var req model.CreateEventLinkRequest
	if err := ParseJSON(r, &req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	link, err := h.linkService.Create(r.Context(), eventID, userID, req)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			Error(w, http.StatusForbidden, "forbidden")
			return
		}
		if strings.Contains(msg, "not found") {
			Error(w, http.StatusNotFound, msg)
			return
		}
		if strings.Contains(msg, "required") || strings.Contains(msg, "only available") {
			Error(w, http.StatusBadRequest, msg)
			return
		}
		Error(w, http.StatusInternalServerError, "failed to create link")
		return
	}

	JSON(w, http.StatusCreated, link)
}

func (h *EventLinkHandler) Delete(w http.ResponseWriter, r *http.Request) {
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

	linkID, err := uuid.Parse(chi.URLParam(r, "linkId"))
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid link id")
		return
	}

	if err := h.linkService.Delete(r.Context(), eventID, linkID, userID); err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			Error(w, http.StatusForbidden, "forbidden")
			return
		}
		if strings.Contains(msg, "not found") {
			Error(w, http.StatusNotFound, msg)
			return
		}
		Error(w, http.StatusInternalServerError, "failed to delete link")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
