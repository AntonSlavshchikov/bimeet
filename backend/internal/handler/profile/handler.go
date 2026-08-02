package profilehandler

import (
	"errors"
	"net/http"
	"strings"

	"bimeet/internal/handler/response"
	"bimeet/internal/middleware"
	"bimeet/internal/model"
	"bimeet/internal/observability"
)

type Handler struct {
	svc ProfileService
}

func New(svc ProfileService) *Handler {
	return &Handler{svc: svc}
}

// @Summary Get current user profile
// @Tags profile
// @Produce json
// @Security BearerAuth
// @Success 200 {object} model.User
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /auth/me [get]
func (h *Handler) GetMe(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	user, err := h.svc.GetMe(r.Context(), userID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to get profile")
		return
	}

	response.JSON(w, http.StatusOK, user)
}

// @Summary Update current user profile
// @Tags profile
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body model.UpdateProfileRequest true "Profile payload"
// @Success 200 {object} model.User
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /auth/me [put]
func (h *Handler) UpdateMe(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req model.UpdateProfileRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		response.Error(w, http.StatusBadRequest, "name is required")
		return
	}

	user, err := h.svc.UpdateMe(r.Context(), userID, req)
	if err != nil {
		if strings.Contains(err.Error(), "invalid birth_date") {
			response.Error(w, http.StatusBadRequest, err.Error())
			return
		}
		response.Error(w, http.StatusInternalServerError, "failed to update profile")
		return
	}

	response.JSON(w, http.StatusOK, user)
}

// @Summary Get current user profile statistics
// @Tags profile
// @Produce json
// @Security BearerAuth
// @Success 200 {object} model.ProfileStats
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /auth/me/stats [get]
func (h *Handler) GetStats(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	stats, err := h.svc.GetStats(r.Context(), userID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to get stats")
		return
	}

	response.JSON(w, http.StatusOK, stats)
}

// @Summary Delete current user avatar
// @Tags profile
// @Produce json
// @Security BearerAuth
// @Success 200 {object} model.User
// @Failure 401 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /auth/me/avatar [delete]
func (h *Handler) DeleteAvatar(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	user, err := h.svc.DeleteAvatar(r.Context(), userID)
	if err != nil {
		observability.FromContext(r.Context()).Error("delete avatar", "error", err)
		response.Error(w, http.StatusInternalServerError, "failed to delete avatar")
		return
	}

	response.JSON(w, http.StatusOK, user)
}

const (
	maxAvatarSize        = 5 << 20 // 5 MB
	maxAvatarRequestSize = maxAvatarSize + 1<<20
)

// @Summary Upload current user avatar
// @Tags profile
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param avatar formData file true "Avatar image"
// @Success 200 {object} model.User
// @Failure 400 {object} response.ErrorResponse
// @Failure 413 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 503 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /auth/me/avatar [post]
func (h *Handler) UploadAvatar(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxAvatarRequestSize)
	if err := r.ParseMultipartForm(maxAvatarSize); err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			response.Error(w, http.StatusRequestEntityTooLarge, "avatar exceeds 5 MB limit")
			return
		}
		response.Error(w, http.StatusBadRequest, "file too large or invalid form")
		return
	}

	file, header, err := r.FormFile("avatar")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "avatar file is required")
		return
	}
	defer func() { _ = file.Close() }()
	if header.Size > maxAvatarSize {
		response.Error(w, http.StatusRequestEntityTooLarge, "avatar exceeds 5 MB limit")
		return
	}

	user, err := h.svc.UploadAvatar(r.Context(), userID, file, header)
	if err != nil {
		observability.FromContext(r.Context()).Error("upload avatar", "error", err)
		if strings.Contains(err.Error(), "unsupported image type") {
			response.Error(w, http.StatusBadRequest, err.Error())
			return
		}
		if strings.Contains(err.Error(), "not configured") {
			response.Error(w, http.StatusServiceUnavailable, "avatar storage is not configured")
			return
		}
		response.Error(w, http.StatusInternalServerError, "failed to upload avatar")
		return
	}

	response.JSON(w, http.StatusOK, user)
}
