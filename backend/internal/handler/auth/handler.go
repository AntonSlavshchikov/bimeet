package authhandler

import (
	"errors"
	"net/http"

	"bimeet/internal/handler/response"
	"bimeet/internal/model"
	authsvc "bimeet/internal/service/auth"
)

type Handler struct {
	svc AuthService
}

func New(svc AuthService) *Handler {
	return &Handler{svc: svc}
}

// RequestCode sends a one-time login code. Always responds 200 (anti-enumeration),
// except when the per-email cooldown is hit → 429.
// @Summary Request a one-time login code
// @Tags auth
// @Accept json
// @Produce json
// @Param request body model.RequestCodeRequest true "Email for login code delivery"
// @Success 200 {object} response.StatusResponse
// @Failure 400 {object} response.ErrorResponse
// @Failure 429 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /auth/request-code [post]
func (h *Handler) RequestCode(w http.ResponseWriter, r *http.Request) {
	var req model.RequestCodeRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.svc.RequestCode(r.Context(), req); err != nil {
		switch {
		case errors.Is(err, authsvc.ErrCooldown):
			response.Error(w, http.StatusTooManyRequests, "please wait before requesting a new code")
		case isBadRequest(err):
			response.Error(w, http.StatusBadRequest, err.Error())
		default:
			response.Error(w, http.StatusInternalServerError, "failed to send code")
		}
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// VerifyCode verifies a one-time code and returns a JWT + user on success.
// @Summary Verify a one-time login code
// @Tags auth
// @Accept json
// @Produce json
// @Param request body model.VerifyCodeRequest true "Email and one-time code"
// @Success 200 {object} model.AuthResponse
// @Failure 400 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /auth/verify-code [post]
func (h *Handler) VerifyCode(w http.ResponseWriter, r *http.Request) {
	var req model.VerifyCodeRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	resp, err := h.svc.VerifyCode(r.Context(), req)
	if err != nil {
		if errors.Is(err, authsvc.ErrInvalidCode) {
			response.Error(w, http.StatusBadRequest, "invalid or expired code")
			return
		}
		response.Error(w, http.StatusInternalServerError, "failed to verify code")
		return
	}

	response.JSON(w, http.StatusOK, resp)
}

// isBadRequest reports whether the error is a client-side validation error
// (missing/invalid email) rather than a server fault.
func isBadRequest(err error) bool {
	msg := err.Error()
	return msg == "email is required" || msg == "invalid email address"
}
