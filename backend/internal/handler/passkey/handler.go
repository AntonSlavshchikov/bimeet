package passkeyhandler

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
	passkeysvc "bimeet/internal/service/passkey"
)

const refreshCookieName = "bimeet_refresh"

type Handler struct {
	svc          PasskeyService
	cookieSecure bool
}

func New(svc PasskeyService, cookieSecure bool) *Handler {
	return &Handler{svc: svc, cookieSecure: cookieSecure}
}

func (h *Handler) Config(w http.ResponseWriter, _ *http.Request) {
	response.JSON(w, http.StatusOK, h.svc.Config())
}

func (h *Handler) BeginLogin(w http.ResponseWriter, r *http.Request) {
	var req model.PasskeyLoginOptionsRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	result, err := h.svc.BeginLogin(r.Context(), req.Mediation)
	if err != nil {
		handleError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, result)
}

func (h *Handler) FinishLogin(w http.ResponseWriter, r *http.Request) {
	var req model.PasskeyVerifyRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	result, err := h.svc.FinishLogin(r.Context(), req, r.UserAgent())
	if err != nil {
		handleError(w, err)
		return
	}
	h.setRefreshCookie(w, result.RefreshToken)
	response.JSON(w, http.StatusOK, result)
}

func (h *Handler) BeginRegistration(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	result, err := h.svc.BeginRegistration(r.Context(), userID)
	if err != nil {
		handleError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, result)
}

func (h *Handler) FinishRegistration(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req model.PasskeyVerifyRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	result, err := h.svc.FinishRegistration(r.Context(), userID, req)
	if err != nil {
		handleError(w, err)
		return
	}
	response.JSON(w, http.StatusCreated, result)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	items, err := h.svc.List(r.Context(), userID)
	if err != nil {
		handleError(w, err)
		return
	}
	if items == nil {
		items = []model.Passkey{}
	}
	response.JSON(w, http.StatusOK, items)
}

func (h *Handler) Rename(w http.ResponseWriter, r *http.Request) {
	userID, id, ok := idsFromRequest(w, r)
	if !ok {
		return
	}
	var req model.RenamePasskeyRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	item, err := h.svc.Rename(r.Context(), userID, id, req)
	if err != nil {
		handleError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, item)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, id, ok := idsFromRequest(w, r)
	if !ok {
		return
	}
	if err := h.svc.Delete(r.Context(), userID, id); err != nil {
		handleError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func idsFromRequest(w http.ResponseWriter, r *http.Request) (uuid.UUID, uuid.UUID, bool) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return uuid.Nil, uuid.Nil, false
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid passkey id")
		return uuid.Nil, uuid.Nil, false
	}
	return userID, id, true
}

func handleError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, passkeysvc.ErrDisabled):
		response.Error(w, http.StatusNotFound, "passkeys are disabled")
	case errors.Is(err, passkeysvc.ErrVerification):
		response.Error(w, http.StatusUnauthorized, "passkey verification failed")
	case errors.Is(err, passkeysvc.ErrInvalidCeremony), errors.Is(err, passkeysvc.ErrInvalidMediation), errors.Is(err, passkeysvc.ErrInvalidName):
		response.Error(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, passkeysvc.ErrDuplicate):
		response.Error(w, http.StatusConflict, err.Error())
	case errors.Is(err, passkeysvc.ErrLimit):
		response.Error(w, http.StatusUnprocessableEntity, err.Error())
	case errors.Is(err, passkeysvc.ErrNotFound):
		response.Error(w, http.StatusNotFound, err.Error())
	default:
		response.Error(w, http.StatusInternalServerError, "passkey operation failed")
	}
}

func (h *Handler) setRefreshCookie(w http.ResponseWriter, token string) {
	if token == "" {
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name: refreshCookieName, Value: token, Path: "/api/auth", HttpOnly: true,
		Secure: h.cookieSecure, SameSite: http.SameSiteStrictMode,
		MaxAge:  int(authsvc.RefreshSessionTTL / time.Second),
		Expires: time.Now().Add(authsvc.RefreshSessionTTL),
	})
}
