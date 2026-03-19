package handler

import (
	"net/http"
	"strings"

	"meetup/internal/model"
	"meetup/internal/service"
)

type AuthHandler struct {
	authService *service.AuthService
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req model.RegisterRequest
	if err := ParseJSON(r, &req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Name = strings.TrimSpace(req.Name)

	resp, err := h.authService.Register(r.Context(), req)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "unique") || strings.Contains(msg, "duplicate") {
			Error(w, http.StatusConflict, "email already in use")
			return
		}
		if strings.Contains(msg, "required") {
			Error(w, http.StatusBadRequest, msg)
			return
		}
		Error(w, http.StatusInternalServerError, "registration failed")
		return
	}

	JSON(w, http.StatusCreated, resp)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req model.LoginRequest
	if err := ParseJSON(r, &req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	resp, err := h.authService.Login(r.Context(), req)
	if err != nil {
		Error(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	JSON(w, http.StatusOK, resp)
}
