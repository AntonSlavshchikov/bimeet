package eventhandler

import (
	"context"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"bimeet-teams/internal/handler/response"
	"bimeet-teams/internal/middleware"
	"bimeet-teams/internal/model"
	eventsvc "bimeet-teams/internal/service/event"
)

type EventService interface {
	Create(ctx context.Context, companyID, organizerID uuid.UUID, req model.CreateEventRequest) (model.Event, error)
	List(ctx context.Context, companyID, userID uuid.UUID) ([]model.EventListItem, error)
	GetDetail(ctx context.Context, eventID, companyID, userID uuid.UUID) (model.EventDetail, error)
	Update(ctx context.Context, eventID, companyID, userID uuid.UUID, req model.UpdateEventRequest) (model.Event, error)
	Delete(ctx context.Context, eventID, companyID, userID uuid.UUID) error
	Complete(ctx context.Context, eventID, companyID, userID uuid.UUID) error
	InviteParticipant(ctx context.Context, eventID, companyID, organizerID uuid.UUID, email string) error
	UpdateParticipantStatus(ctx context.Context, eventID, companyID, userID uuid.UUID, status string) error
}

type Handler struct {
	svc EventService
}

func New(svc EventService) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	companyID, _ := middleware.CompanyIDFromCtx(r.Context())
	userID, _ := middleware.UserIDFromCtx(r.Context())
	events, err := h.svc.List(r.Context(), companyID, userID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to list events")
		return
	}
	response.JSON(w, http.StatusOK, events)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	companyID, _ := middleware.CompanyIDFromCtx(r.Context())
	userID, _ := middleware.UserIDFromCtx(r.Context())
	var req model.CreateEventRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	ev, err := h.svc.Create(r.Context(), companyID, userID, req)
	if err != nil {
		writeError(w, err)
		return
	}
	response.JSON(w, http.StatusCreated, ev)
}

func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	eventID, ok := parseID(w, r)
	if !ok {
		return
	}
	companyID, _ := middleware.CompanyIDFromCtx(r.Context())
	userID, _ := middleware.UserIDFromCtx(r.Context())
	detail, err := h.svc.GetDetail(r.Context(), eventID, companyID, userID)
	if err != nil {
		writeError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, detail)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	eventID, ok := parseID(w, r)
	if !ok {
		return
	}
	companyID, _ := middleware.CompanyIDFromCtx(r.Context())
	userID, _ := middleware.UserIDFromCtx(r.Context())
	var req model.UpdateEventRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	ev, err := h.svc.Update(r.Context(), eventID, companyID, userID, req)
	if err != nil {
		writeError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, ev)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	eventID, ok := parseID(w, r)
	if !ok {
		return
	}
	companyID, _ := middleware.CompanyIDFromCtx(r.Context())
	userID, _ := middleware.UserIDFromCtx(r.Context())
	if err := h.svc.Delete(r.Context(), eventID, companyID, userID); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) Complete(w http.ResponseWriter, r *http.Request) {
	eventID, ok := parseID(w, r)
	if !ok {
		return
	}
	companyID, _ := middleware.CompanyIDFromCtx(r.Context())
	userID, _ := middleware.UserIDFromCtx(r.Context())
	if err := h.svc.Complete(r.Context(), eventID, companyID, userID); err != nil {
		writeError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"status": "completed"})
}

func (h *Handler) InviteParticipant(w http.ResponseWriter, r *http.Request) {
	eventID, ok := parseID(w, r)
	if !ok {
		return
	}
	companyID, _ := middleware.CompanyIDFromCtx(r.Context())
	userID, _ := middleware.UserIDFromCtx(r.Context())
	var req model.InviteParticipantRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := h.svc.InviteParticipant(r.Context(), eventID, companyID, userID, req.Email); err != nil {
		writeError(w, err)
		return
	}
	response.JSON(w, http.StatusCreated, map[string]string{"status": "invited"})
}

func (h *Handler) UpdateMyStatus(w http.ResponseWriter, r *http.Request) {
	eventID, ok := parseID(w, r)
	if !ok {
		return
	}
	companyID, _ := middleware.CompanyIDFromCtx(r.Context())
	userID, _ := middleware.UserIDFromCtx(r.Context())
	var req model.UpdateParticipantStatusRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := h.svc.UpdateParticipantStatus(r.Context(), eventID, companyID, userID, req.Status); err != nil {
		writeError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"status": req.Status})
}

func parseID(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid event id")
		return uuid.Nil, false
	}
	return id, true
}

func writeError(w http.ResponseWriter, err error) {
	var verr eventsvc.ValidationError
	switch {
	case errors.As(err, &verr):
		response.Error(w, http.StatusBadRequest, verr.Msg)
	case errors.Is(err, eventsvc.ErrForbidden):
		response.Error(w, http.StatusForbidden, "forbidden")
	case errors.Is(err, eventsvc.ErrNotFound):
		response.Error(w, http.StatusNotFound, "event not found")
	default:
		response.Error(w, http.StatusInternalServerError, "internal error")
	}
}
