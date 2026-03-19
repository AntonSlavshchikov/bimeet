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

type EventHandler struct {
	eventService *service.EventService
}

func NewEventHandler(eventService *service.EventService) *EventHandler {
	return &EventHandler{eventService: eventService}
}

func (h *EventHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	events, err := h.eventService.List(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to list events")
		return
	}
	if events == nil {
		events = []model.EventListItem{}
	}
	JSON(w, http.StatusOK, events)
}

func (h *EventHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req model.CreateEventRequest
	if err := ParseJSON(r, &req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	event, err := h.eventService.Create(r.Context(), req, userID)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "required") || strings.Contains(msg, "must be") {
			Error(w, http.StatusBadRequest, msg)
			return
		}
		Error(w, http.StatusInternalServerError, "failed to create event")
		return
	}

	JSON(w, http.StatusCreated, event)
}

func (h *EventHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid event id")
		return
	}

	event, err := h.eventService.GetByID(r.Context(), id, userID)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			Error(w, http.StatusForbidden, "forbidden")
			return
		}
		Error(w, http.StatusNotFound, "event not found")
		return
	}

	JSON(w, http.StatusOK, event)
}

func (h *EventHandler) GetByInviteToken(w http.ResponseWriter, r *http.Request) {
	tokenStr := chi.URLParam(r, "token")
	token, err := uuid.Parse(tokenStr)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid invite token")
		return
	}

	event, err := h.eventService.GetByInviteToken(r.Context(), token)
	if err != nil {
		Error(w, http.StatusNotFound, "event not found")
		return
	}

	JSON(w, http.StatusOK, event)
}

func (h *EventHandler) JoinByInviteToken(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	tokenStr := chi.URLParam(r, "token")
	token, err := uuid.Parse(tokenStr)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid invite token")
		return
	}

	participant, err := h.eventService.JoinByInviteToken(r.Context(), token, userID)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "organizer") {
			Error(w, http.StatusConflict, msg)
			return
		}
		Error(w, http.StatusNotFound, "event not found")
		return
	}

	JSON(w, http.StatusOK, participant)
}

func (h *EventHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid event id")
		return
	}

	var req model.UpdateEventRequest
	if err := ParseJSON(r, &req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	event, err := h.eventService.Update(r.Context(), id, userID, req)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			Error(w, http.StatusForbidden, "forbidden")
			return
		}
		if strings.Contains(msg, "not found") {
			Error(w, http.StatusNotFound, "event not found")
			return
		}
		Error(w, http.StatusInternalServerError, "failed to update event")
		return
	}

	JSON(w, http.StatusOK, event)
}

func (h *EventHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid event id")
		return
	}

	if err := h.eventService.Delete(r.Context(), id, userID); err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			Error(w, http.StatusForbidden, "forbidden")
			return
		}
		if strings.Contains(msg, "not found") {
			Error(w, http.StatusNotFound, "event not found")
			return
		}
		Error(w, http.StatusInternalServerError, "failed to delete event")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *EventHandler) InviteParticipant(w http.ResponseWriter, r *http.Request) {
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

	var req model.InviteParticipantRequest
	if err := ParseJSON(r, &req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	participant, err := h.eventService.InviteParticipant(r.Context(), eventID, userID, req)
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
		Error(w, http.StatusBadRequest, msg)
		return
	}

	JSON(w, http.StatusCreated, participant)
}

func (h *EventHandler) UpdateParticipantStatus(w http.ResponseWriter, r *http.Request) {
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

	targetUserID, err := uuid.Parse(chi.URLParam(r, "userId"))
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid user id")
		return
	}

	var req model.UpdateParticipantStatusRequest
	if err := ParseJSON(r, &req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	participant, err := h.eventService.UpdateParticipantStatus(r.Context(), eventID, targetUserID, userID, req)
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
		Error(w, http.StatusBadRequest, msg)
		return
	}

	JSON(w, http.StatusOK, participant)
}
