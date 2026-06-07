package authhandler

import (
	"context"
	"errors"
	"net/http"

	"bimeet-teams/internal/handler/response"
	"bimeet-teams/internal/model"
	authsvc "bimeet-teams/internal/service/auth"
)

type AuthService interface {
	RegisterCompany(ctx context.Context, req model.RegisterCompanyRequest) (model.AuthResponse, error)
	Login(ctx context.Context, req model.LoginRequest) (model.AuthResponse, error)
	AcceptInvite(ctx context.Context, req model.AcceptInviteRequest) (model.AuthResponse, error)
}

type Handler struct {
	svc AuthService
}

func New(svc AuthService) *Handler {
	return &Handler{svc: svc}
}

// RegisterCompany creates a company + owner and returns a session.
func (h *Handler) RegisterCompany(w http.ResponseWriter, r *http.Request) {
	var req model.RegisterCompanyRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	resp, err := h.svc.RegisterCompany(r.Context(), req)
	if err != nil {
		writeAuthError(w, err)
		return
	}
	response.JSON(w, http.StatusCreated, resp)
}

// Login authenticates a user within a company (resolved by subdomain).
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req model.LoginRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	resp, err := h.svc.Login(r.Context(), req)
	if err != nil {
		writeAuthError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, resp)
}

// AcceptInvite sets a password for an invited member and returns a session.
func (h *Handler) AcceptInvite(w http.ResponseWriter, r *http.Request) {
	var req model.AcceptInviteRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	resp, err := h.svc.AcceptInvite(r.Context(), req)
	if err != nil {
		writeAuthError(w, err)
		return
	}
	response.JSON(w, http.StatusCreated, resp)
}

// writeAuthError maps service sentinels/validation to the right status code.
func writeAuthError(w http.ResponseWriter, err error) {
	var verr authsvc.ValidationError
	switch {
	case errors.As(err, &verr):
		response.Error(w, http.StatusBadRequest, verr.Msg)
	case errors.Is(err, authsvc.ErrSubdomainTaken):
		response.Error(w, http.StatusConflict, err.Error())
	case errors.Is(err, authsvc.ErrSubdomainReserved):
		response.Error(w, http.StatusConflict, err.Error())
	case errors.Is(err, authsvc.ErrInvalidCredentials), errors.Is(err, authsvc.ErrInactive):
		response.Error(w, http.StatusUnauthorized, err.Error())
	case errors.Is(err, authsvc.ErrInvalidInvite):
		response.Error(w, http.StatusBadRequest, err.Error())
	default:
		response.Error(w, http.StatusInternalServerError, "internal error")
	}
}
