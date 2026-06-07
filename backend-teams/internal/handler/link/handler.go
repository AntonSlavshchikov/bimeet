package linkhandler

import (
	"context"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"bimeet-teams/internal/handler/response"
	"bimeet-teams/internal/middleware"
	"bimeet-teams/internal/model"
	linksvc "bimeet-teams/internal/service/link"
)

type LinkService interface {
	List(ctx context.Context, eventID, companyID, userID uuid.UUID) ([]model.LinkInfo, error)
	Create(ctx context.Context, eventID, companyID, userID uuid.UUID, req model.CreateLinkRequest) (model.LinkInfo, error)
	Delete(ctx context.Context, eventID, companyID, userID, linkID uuid.UUID) error
}

type Handler struct {
	svc LinkService
}

func New(svc LinkService) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	eventID, ok := parseUUID(w, r, "id", "invalid event id")
	if !ok {
		return
	}
	companyID, _ := middleware.CompanyIDFromCtx(r.Context())
	userID, _ := middleware.UserIDFromCtx(r.Context())
	links, err := h.svc.List(r.Context(), eventID, companyID, userID)
	if err != nil {
		writeError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, links)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	eventID, ok := parseUUID(w, r, "id", "invalid event id")
	if !ok {
		return
	}
	companyID, _ := middleware.CompanyIDFromCtx(r.Context())
	userID, _ := middleware.UserIDFromCtx(r.Context())
	var req model.CreateLinkRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	link, err := h.svc.Create(r.Context(), eventID, companyID, userID, req)
	if err != nil {
		writeError(w, err)
		return
	}
	response.JSON(w, http.StatusCreated, link)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	eventID, ok := parseUUID(w, r, "id", "invalid event id")
	if !ok {
		return
	}
	linkID, ok := parseUUID(w, r, "linkId", "invalid link id")
	if !ok {
		return
	}
	companyID, _ := middleware.CompanyIDFromCtx(r.Context())
	userID, _ := middleware.UserIDFromCtx(r.Context())
	if err := h.svc.Delete(r.Context(), eventID, companyID, userID, linkID); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
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
	var verr linksvc.ValidationError
	switch {
	case errors.As(err, &verr):
		response.Error(w, http.StatusBadRequest, verr.Msg)
	case errors.Is(err, linksvc.ErrForbidden):
		response.Error(w, http.StatusForbidden, "forbidden")
	case errors.Is(err, linksvc.ErrNotFound):
		response.Error(w, http.StatusNotFound, "event not found")
	default:
		response.Error(w, http.StatusInternalServerError, "internal error")
	}
}
