package authhandler

import (
	"net/http"
	"strings"

	"bimeet/internal/handler/response"
	"bimeet/internal/model"
)

type Handler struct {
	svc AuthService
}

func New(svc AuthService) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req model.RegisterRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Name = strings.TrimSpace(req.Name)

	resp, err := h.svc.Register(r.Context(), req)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "unique") || strings.Contains(msg, "duplicate") {
			response.Error(w, http.StatusConflict, "email already in use")
			return
		}
		if strings.Contains(msg, "required") {
			response.Error(w, http.StatusBadRequest, msg)
			return
		}
		response.Error(w, http.StatusInternalServerError, "registration failed")
		return
	}

	response.JSON(w, http.StatusCreated, resp)
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req model.LoginRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	resp, err := h.svc.Login(r.Context(), req)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	response.JSON(w, http.StatusOK, resp)
}
