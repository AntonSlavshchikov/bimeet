package authhandler

import (
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"bimeet/internal/handler/response"
	"bimeet/internal/middleware"
	"bimeet/internal/model"
	authsvc "bimeet/internal/service/auth"
)

type Handler struct {
	svc          AuthService
	cookieSecure bool
}

const (
	refreshCookieName = "bimeet_refresh"
)

func New(svc AuthService, cookieSecure bool) *Handler {
	return &Handler{svc: svc, cookieSecure: cookieSecure}
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

	resp, err := h.svc.VerifyCode(r.Context(), req, r.UserAgent())
	if err != nil {
		if errors.Is(err, authsvc.ErrInvalidCode) {
			response.Error(w, http.StatusBadRequest, "invalid or expired code")
			return
		}
		response.Error(w, http.StatusInternalServerError, "failed to verify code")
		return
	}

	h.setRefreshCookie(w, resp.RefreshToken)
	response.JSON(w, http.StatusOK, resp)
}

// Refresh rotates the one-time refresh token and returns a new access token.
// The replacement refresh token is delivered only through an HttpOnly cookie.
// @Summary Refresh an authenticated session
// @Tags auth
// @Produce json
// @Success 200 {object} model.RefreshResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /auth/refresh [post]
func (h *Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(refreshCookieName)
	if err != nil {
		h.clearRefreshCookie(w)
		response.Error(w, http.StatusUnauthorized, "invalid refresh token")
		return
	}

	resp, err := h.svc.Refresh(r.Context(), cookie.Value, r.UserAgent())
	if err != nil {
		if errors.Is(err, authsvc.ErrInvalidRefreshToken) {
			h.clearRefreshCookie(w)
			response.Error(w, http.StatusUnauthorized, "invalid refresh token")
			return
		}
		response.Error(w, http.StatusInternalServerError, "failed to refresh session")
		return
	}

	h.setRefreshCookie(w, resp.RefreshToken)
	response.JSON(w, http.StatusOK, resp)
}

// Logout revokes the current refresh token and clears its cookie.
// @Summary Log out and revoke the current session
// @Tags auth
// @Success 204
// @Failure 500 {object} response.ErrorResponse
// @Router /auth/logout [post]
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(refreshCookieName)
	if err == nil {
		if err := h.svc.RevokeRefreshToken(r.Context(), cookie.Value); err != nil {
			h.clearRefreshCookie(w)
			response.Error(w, http.StatusInternalServerError, "failed to revoke session")
			return
		}
	}
	h.clearRefreshCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

// ListSessions returns all active sessions for the current user.
// @Summary List current user sessions
// @Tags auth
// @Produce json
// @Security BearerAuth
// @Success 200 {array} model.AuthSession
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /auth/me/sessions [get]
func (h *Handler) ListSessions(w http.ResponseWriter, r *http.Request) {
	userID, sessionID, ok := authContext(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	sessions, err := h.svc.ListSessions(r.Context(), userID, sessionID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to list sessions")
		return
	}
	response.JSON(w, http.StatusOK, sessions)
}

// RevokeSession ends one session owned by the current user.
// @Summary Revoke a current user session
// @Tags auth
// @Security BearerAuth
// @Param id path string true "Session ID"
// @Success 204
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /auth/me/sessions/{id} [delete]
func (h *Handler) RevokeSession(w http.ResponseWriter, r *http.Request) {
	userID, currentSessionID, ok := authContext(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	targetSessionID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid session id")
		return
	}

	if err := h.svc.RevokeSession(r.Context(), userID, targetSessionID); err != nil {
		if errors.Is(err, authsvc.ErrSessionNotFound) {
			response.Error(w, http.StatusNotFound, "session not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "failed to revoke session")
		return
	}
	if targetSessionID == currentSessionID {
		h.clearRefreshCookie(w)
	}
	w.WriteHeader(http.StatusNoContent)
}

// RevokeOtherSessions ends every active session except the caller's.
// @Summary Revoke all other current user sessions
// @Tags auth
// @Security BearerAuth
// @Success 204
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /auth/me/sessions/others [delete]
func (h *Handler) RevokeOtherSessions(w http.ResponseWriter, r *http.Request) {
	userID, sessionID, ok := authContext(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if err := h.svc.RevokeOtherSessions(r.Context(), userID, sessionID); err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to revoke other sessions")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func authContext(r *http.Request) (uuid.UUID, uuid.UUID, bool) {
	userID, hasUser := middleware.UserIDFromCtx(r.Context())
	sessionID, hasSession := middleware.SessionIDFromCtx(r.Context())
	return userID, sessionID, hasUser && hasSession
}

func (h *Handler) setRefreshCookie(w http.ResponseWriter, token string) {
	if token == "" {
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     refreshCookieName,
		Value:    token,
		Path:     "/api/auth",
		HttpOnly: true,
		Secure:   h.cookieSecure,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   int(authsvc.RefreshSessionTTL / time.Second),
		Expires:  time.Now().Add(authsvc.RefreshSessionTTL),
	})
}

func (h *Handler) clearRefreshCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     refreshCookieName,
		Value:    "",
		Path:     "/api/auth",
		HttpOnly: true,
		Secure:   h.cookieSecure,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   -1,
		Expires:  time.Unix(1, 0),
	})
}

// isBadRequest reports whether the error is a client-side validation error
// (missing/invalid email) rather than a server fault.
func isBadRequest(err error) bool {
	msg := err.Error()
	return msg == "email is required" || msg == "invalid email address"
}
