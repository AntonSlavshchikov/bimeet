package pollhandler

import (
	"context"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"bimeet-teams/internal/handler/response"
	"bimeet-teams/internal/middleware"
	"bimeet-teams/internal/model"
	pollsvc "bimeet-teams/internal/service/poll"
)

type PollService interface {
	Create(ctx context.Context, eventID, companyID, userID uuid.UUID, req model.CreatePollRequest) (model.PollInfo, error)
	Vote(ctx context.Context, eventID, companyID, userID, pollID, optionID uuid.UUID) error
}

type Handler struct {
	svc PollService
}

func New(svc PollService) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	eventID, ok := parseUUID(w, r, "id", "invalid event id")
	if !ok {
		return
	}
	companyID, _ := middleware.CompanyIDFromCtx(r.Context())
	userID, _ := middleware.UserIDFromCtx(r.Context())
	var req model.CreatePollRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	poll, err := h.svc.Create(r.Context(), eventID, companyID, userID, req)
	if err != nil {
		writeError(w, err)
		return
	}
	response.JSON(w, http.StatusCreated, poll)
}

func (h *Handler) Vote(w http.ResponseWriter, r *http.Request) {
	eventID, ok := parseUUID(w, r, "id", "invalid event id")
	if !ok {
		return
	}
	pollID, ok := parseUUID(w, r, "pollId", "invalid poll id")
	if !ok {
		return
	}
	companyID, _ := middleware.CompanyIDFromCtx(r.Context())
	userID, _ := middleware.UserIDFromCtx(r.Context())
	var req model.VoteRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := h.svc.Vote(r.Context(), eventID, companyID, userID, pollID, req.OptionID); err != nil {
		writeError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"status": "voted"})
}

func parseUUID(w http.ResponseWriter, r *http.Request, param, msg string) (uuid.UUID, bool) {
	id, err := uuid.Parse(chi.URLParam(r, param))
	if err != nil {
		response.Error(w, http.StatusBadRequest, msg)
		return uuid.Nil, false
	}
	return id, true
}

func writeError(w http.ResponseWriter, err error) {
	var verr pollsvc.ValidationError
	switch {
	case errors.As(err, &verr):
		response.Error(w, http.StatusBadRequest, verr.Msg)
	case errors.Is(err, pollsvc.ErrForbidden):
		response.Error(w, http.StatusForbidden, "forbidden")
	case errors.Is(err, pollsvc.ErrNotFound):
		response.Error(w, http.StatusNotFound, "event not found")
	default:
		response.Error(w, http.StatusInternalServerError, "internal error")
	}
}
