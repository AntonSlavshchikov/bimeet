package companyhandler

import (
	"context"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"bimeet-teams/internal/handler/response"
	"bimeet-teams/internal/middleware"
	"bimeet-teams/internal/model"
	companysvc "bimeet-teams/internal/service/company"
)

type CompanyService interface {
	Get(ctx context.Context, companyID uuid.UUID) (model.Company, error)
	Me(ctx context.Context, userID, companyID uuid.UUID) (model.MeResponse, error)
	PublicBySubdomain(ctx context.Context, subdomain string) (model.PublicCompany, error)
	Update(ctx context.Context, companyID uuid.UUID, req model.UpdateCompanyRequest) (model.Company, error)
	Invite(ctx context.Context, companyID, invitedBy uuid.UUID, req model.InviteRequest) (model.InviteResponse, error)
	Members(ctx context.Context, companyID uuid.UUID) ([]model.User, error)
	SetMemberActive(ctx context.Context, companyID, callerID, targetID uuid.UUID, active bool) (model.User, error)
}

type Handler struct {
	svc CompanyService
}

func New(svc CompanyService) *Handler {
	return &Handler{svc: svc}
}

// PublicBySubdomain returns brand info for theming the login page (no auth).
func (h *Handler) PublicBySubdomain(w http.ResponseWriter, r *http.Request) {
	subdomain := chi.URLParam(r, "subdomain")
	c, err := h.svc.PublicBySubdomain(r.Context(), subdomain)
	if err != nil {
		response.Error(w, http.StatusNotFound, "company not found")
		return
	}
	response.JSON(w, http.StatusOK, c)
}

// Me returns the authenticated user and their company.
func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromCtx(r.Context())
	companyID, _ := middleware.CompanyIDFromCtx(r.Context())
	me, err := h.svc.Me(r.Context(), userID, companyID)
	if err != nil {
		response.Error(w, http.StatusNotFound, "not found")
		return
	}
	response.JSON(w, http.StatusOK, me)
}

// GetMine returns the authenticated user's company.
func (h *Handler) GetMine(w http.ResponseWriter, r *http.Request) {
	companyID, _ := middleware.CompanyIDFromCtx(r.Context())
	c, err := h.svc.Get(r.Context(), companyID)
	if err != nil {
		response.Error(w, http.StatusNotFound, "company not found")
		return
	}
	response.JSON(w, http.StatusOK, c)
}

// Update changes company branding (owner only).
func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	companyID, _ := middleware.CompanyIDFromCtx(r.Context())
	var req model.UpdateCompanyRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	c, err := h.svc.Update(r.Context(), companyID, req)
	if err != nil {
		writeCompanyError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, c)
}

// Invite creates an employee invitation (owner only).
func (h *Handler) Invite(w http.ResponseWriter, r *http.Request) {
	companyID, _ := middleware.CompanyIDFromCtx(r.Context())
	userID, _ := middleware.UserIDFromCtx(r.Context())
	var req model.InviteRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	resp, err := h.svc.Invite(r.Context(), companyID, userID, req)
	if err != nil {
		writeCompanyError(w, err)
		return
	}
	response.JSON(w, http.StatusCreated, resp)
}

// Members lists company users (owner only).
func (h *Handler) Members(w http.ResponseWriter, r *http.Request) {
	companyID, _ := middleware.CompanyIDFromCtx(r.Context())
	members, err := h.svc.Members(r.Context(), companyID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to list members")
		return
	}
	response.JSON(w, http.StatusOK, members)
}

// SetMemberActive enables/disables a member account (owner only).
func (h *Handler) SetMemberActive(w http.ResponseWriter, r *http.Request) {
	companyID, _ := middleware.CompanyIDFromCtx(r.Context())
	callerID, _ := middleware.UserIDFromCtx(r.Context())

	targetID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}

	var body struct {
		IsActive bool `json:"is_active"`
	}
	if err := response.ParseJSON(r, &body); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	user, err := h.svc.SetMemberActive(r.Context(), companyID, callerID, targetID, body.IsActive)
	if err != nil {
		writeCompanyError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, user)
}

func writeCompanyError(w http.ResponseWriter, err error) {
	var verr companysvc.ValidationError
	switch {
	case errors.As(err, &verr):
		response.Error(w, http.StatusBadRequest, verr.Msg)
	case errors.Is(err, companysvc.ErrAlreadyMember):
		response.Error(w, http.StatusConflict, err.Error())
	case errors.Is(err, companysvc.ErrCannotSelfChange):
		response.Error(w, http.StatusForbidden, err.Error())
	case errors.Is(err, companysvc.ErrNotFound):
		response.Error(w, http.StatusNotFound, err.Error())
	default:
		response.Error(w, http.StatusInternalServerError, "internal error")
	}
}
