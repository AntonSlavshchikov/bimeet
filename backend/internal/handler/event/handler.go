package eventhandler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"bimeet/internal/handler/response"
	"bimeet/internal/middleware"
	"bimeet/internal/model"
	eventsvc "bimeet/internal/service/event"
)

type Handler struct {
	svc EventService
}

func New(svc EventService) *Handler {
	return &Handler{svc: svc}
}

// @Summary List events for the current user
// @Tags events
// @Produce json
// @Security BearerAuth
// @Success 200 {array} model.EventListItem
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /events/ [get]
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	events, err := h.svc.List(r.Context(), userID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to list events")
		return
	}
	if events == nil {
		events = []model.EventListItem{}
	}
	response.JSON(w, http.StatusOK, events)
}

// @Summary Create an event
// @Tags events
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body model.CreateEventRequest true "Event payload"
// @Success 201 {object} model.Event
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /events/ [post]
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req model.CreateEventRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	event, err := h.svc.Create(r.Context(), req, userID)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "required") || strings.Contains(msg, "must be") {
			response.Error(w, http.StatusBadRequest, msg)
			return
		}
		response.Error(w, http.StatusInternalServerError, "failed to create event")
		return
	}

	response.JSON(w, http.StatusCreated, event)
}

// @Summary Get event details
// @Tags events
// @Produce json
// @Security BearerAuth
// @Param id path string true "Event ID"
// @Success 200 {object} model.EventDetail
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /events/{id}/ [get]
func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid event id")
		return
	}

	event, err := h.svc.GetByID(r.Context(), id, userID)
	if err != nil {
		if errors.Is(err, eventsvc.ErrForbidden) || strings.Contains(err.Error(), "forbidden") {
			response.Error(w, http.StatusForbidden, "forbidden")
			return
		}
		response.Error(w, http.StatusNotFound, "event not found")
		return
	}

	response.JSON(w, http.StatusOK, event)
}

// @Summary Get public invite event details
// @Tags events
// @Produce json
// @Param token path string true "Invite token"
// @Success 200 {object} model.InviteEventInfo
// @Failure 400 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /events/invite/{token} [get]
func (h *Handler) GetByInviteToken(w http.ResponseWriter, r *http.Request) {
	tokenStr := chi.URLParam(r, "token")
	token, err := uuid.Parse(tokenStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid invite token")
		return
	}

	event, err := h.svc.GetByInviteToken(r.Context(), token)
	if err != nil {
		response.Error(w, http.StatusNotFound, "event not found")
		return
	}

	response.JSON(w, http.StatusOK, event)
}

// @Summary Join or decline an event by invite token
// @Tags events
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param token path string true "Invite token"
// @Param request body model.JoinByInviteTokenRequest false "Join action"
// @Success 200 {object} model.EventParticipant
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 409 {object} response.ErrorResponse
// @Router /events/invite/{token} [post]
func (h *Handler) JoinByInviteToken(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	tokenStr := chi.URLParam(r, "token")
	token, err := uuid.Parse(tokenStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid invite token")
		return
	}

	var req model.JoinByInviteTokenRequest
	// Body is optional — ignore parse errors (empty body = join)
	_ = response.ParseJSON(r, &req)

	participant, err := h.svc.JoinByInviteToken(r.Context(), token, userID, req)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "organizer") {
			response.Error(w, http.StatusConflict, msg)
			return
		}
		if strings.Contains(msg, "action") {
			response.Error(w, http.StatusBadRequest, msg)
			return
		}
		response.Error(w, http.StatusNotFound, "event not found")
		return
	}

	response.JSON(w, http.StatusOK, participant)
}

// @Summary Update an event
// @Tags events
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Event ID"
// @Param request body model.UpdateEventRequest true "Patchable event fields"
// @Success 200 {object} model.Event
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /events/{id}/ [put]
func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid event id")
		return
	}

	var req model.UpdateEventRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	event, err := h.svc.Update(r.Context(), id, userID, req)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			response.Error(w, http.StatusForbidden, "forbidden")
			return
		}
		if strings.Contains(msg, "not found") {
			response.Error(w, http.StatusNotFound, "event not found")
			return
		}
		if strings.Contains(msg, "required") || strings.Contains(msg, "must be") {
			response.Error(w, http.StatusBadRequest, msg)
			return
		}
		response.Error(w, http.StatusInternalServerError, "failed to update event")
		return
	}

	response.JSON(w, http.StatusOK, event)
}

// @Summary Delete an event
// @Tags events
// @Security BearerAuth
// @Param id path string true "Event ID"
// @Success 204 "No Content"
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /events/{id}/ [delete]
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid event id")
		return
	}

	if err := h.svc.Delete(r.Context(), id, userID); err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			response.Error(w, http.StatusForbidden, "forbidden")
			return
		}
		if strings.Contains(msg, "not found") {
			response.Error(w, http.StatusNotFound, "event not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "failed to delete event")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// @Summary Mark an event as completed
// @Tags events
// @Security BearerAuth
// @Param id path string true "Event ID"
// @Success 204 "No Content"
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /events/{id}/complete [post]
func (h *Handler) Complete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid event id")
		return
	}

	if err := h.svc.Complete(r.Context(), id, userID); err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			response.Error(w, http.StatusForbidden, "forbidden")
			return
		}
		if strings.Contains(msg, "not found") {
			response.Error(w, http.StatusNotFound, "event not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "failed to complete event")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// @Summary Invite a participant by email
// @Tags participants
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Event ID"
// @Param request body model.InviteParticipantRequest true "Participant email"
// @Success 201 {object} model.EventParticipant
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /events/{id}/participants [post]
func (h *Handler) InviteParticipant(w http.ResponseWriter, r *http.Request) {
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

	var req model.InviteParticipantRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	p, err := h.svc.InviteParticipant(r.Context(), eventID, userID, req)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			response.Error(w, http.StatusForbidden, "forbidden")
			return
		}
		if strings.Contains(msg, "not found") {
			response.Error(w, http.StatusNotFound, msg)
			return
		}
		response.Error(w, http.StatusBadRequest, msg)
		return
	}

	response.JSON(w, http.StatusCreated, p)
}

// @Summary Update the caller's participant status
// @Tags participants
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Event ID"
// @Param userId path string true "Ignored participant user ID kept for compatibility"
// @Param request body model.UpdateParticipantStatusRequest true "Participant status"
// @Success 200 {object} model.EventParticipant
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /events/{id}/participants [patch]
// @Router /events/{id}/participants/{userId} [patch]
func (h *Handler) UpdateParticipantStatus(w http.ResponseWriter, r *http.Request) {
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

	// A user may only change their own status: the target is always the caller.
	// Any {userId} path param (kept for route compatibility) is ignored.
	var req model.UpdateParticipantStatusRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	participant, err := h.svc.UpdateParticipantStatus(r.Context(), eventID, userID, userID, req)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			response.Error(w, http.StatusForbidden, "forbidden")
			return
		}
		if strings.Contains(msg, "not found") {
			response.Error(w, http.StatusNotFound, msg)
			return
		}
		response.Error(w, http.StatusBadRequest, msg)
		return
	}

	response.JSON(w, http.StatusOK, participant)
}

// @Summary List public events
// @Tags events
// @Produce json
// @Security BearerAuth
// @Param city_id query string false "Filter by FIAS city UUID" format(uuid)
// @Success 200 {array} model.PublicEventListItem
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /events/public [get]
func (h *Handler) ListPublic(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var cityID *uuid.UUID
	if rawCityID := r.URL.Query().Get("city_id"); rawCityID != "" {
		parsedCityID, err := uuid.Parse(rawCityID)
		if err != nil {
			response.Error(w, http.StatusBadRequest, "invalid city_id")
			return
		}
		cityID = &parsedCityID
	}

	events, err := h.svc.ListPublic(r.Context(), userID, cityID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to list public events")
		return
	}
	if events == nil {
		events = []model.PublicEventListItem{}
	}
	response.JSON(w, http.StatusOK, events)
}

// @Summary Join a public event
// @Tags events
// @Produce json
// @Security BearerAuth
// @Param id path string true "Event ID"
// @Success 200 {object} response.StatusResponse
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 409 {object} response.ErrorResponse
// @Router /events/{id}/join [post]
func (h *Handler) JoinPublic(w http.ResponseWriter, r *http.Request) {
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

	if err := h.svc.JoinPublic(r.Context(), eventID, userID); err != nil {
		if errors.Is(err, eventsvc.ErrForbidden) {
			response.Error(w, http.StatusForbidden, "forbidden")
			return
		}
		if errors.Is(err, eventsvc.ErrFull) {
			response.Error(w, http.StatusConflict, "event is full")
			return
		}
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"status": "joined"})
}
