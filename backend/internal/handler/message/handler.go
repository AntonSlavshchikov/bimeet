package messagehandler

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"bimeet/internal/handler/response"
	"bimeet/internal/middleware"
	"bimeet/internal/model"
	"bimeet/internal/observability"
)

type Handler struct {
	svc MessageService
}

func New(svc MessageService) *Handler {
	return &Handler{svc: svc}
}

// writeErr maps service error strings to HTTP statuses (same convention as poll).
func writeErr(w http.ResponseWriter, err error, fallbackMsg string) {
	msg := err.Error()
	switch {
	case strings.Contains(msg, "forbidden"):
		response.Error(w, http.StatusForbidden, "forbidden")
	case strings.Contains(msg, "not found"):
		response.Error(w, http.StatusNotFound, msg)
	case strings.Contains(msg, "required"), strings.Contains(msg, "too long"), strings.Contains(msg, "belong"), strings.Contains(msg, "not a single emoji"):
		response.Error(w, http.StatusBadRequest, msg)
	default:
		response.Error(w, http.StatusInternalServerError, fallbackMsg)
	}
}

// @Summary List event chat messages
// @Tags messages
// @Produce json
// @Security BearerAuth
// @Param id path string true "Event ID"
// @Param limit query int false "Maximum number of messages"
// @Success 200 {array} model.Message
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /events/{id}/messages [get]
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid event id")
		return
	}
	limit := 0
	if v := r.URL.Query().Get("limit"); v != "" {
		limit, _ = strconv.Atoi(v)
	}
	var before *time.Time
	if v := r.URL.Query().Get("before"); v != "" {
		if t, err := time.Parse(time.RFC3339Nano, v); err == nil {
			before = &t
		}
	}

	msgs, err := h.svc.List(r.Context(), eventID, userID, before, limit)
	if err != nil {
		writeErr(w, err, "failed to list messages")
		return
	}
	if msgs == nil {
		msgs = []model.Message{}
	}
	response.JSON(w, http.StatusOK, msgs)
}

// @Summary Post an event chat message
// @Tags messages
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Event ID"
// @Param request body model.PostMessageRequest true "Message payload"
// @Success 201 {object} model.Message
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /events/{id}/messages [post]
func (h *Handler) Post(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid event id")
		return
	}
	var req model.PostMessageRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	msg, err := h.svc.Post(r.Context(), eventID, userID, req)
	if err != nil {
		writeErr(w, err, "failed to post message")
		return
	}
	response.JSON(w, http.StatusCreated, msg)
}

const (
	maxImageSize        = 10 << 20 // 10 MB
	maxImageRequestSize = maxImageSize + 1<<20
)

// @Summary Post an event chat photo
// @Tags messages
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param id path string true "Event ID"
// @Param image formData file true "Image"
// @Param body formData string false "Caption"
// @Success 201 {object} model.Message
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /events/{id}/messages/image [post]
func (h *Handler) PostImage(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid event id")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxImageRequestSize)
	if err := r.ParseMultipartForm(maxImageSize); err != nil {
		response.Error(w, http.StatusBadRequest, "file too large or invalid form")
		return
	}
	file, header, err := r.FormFile("image")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "image file is required")
		return
	}
	defer func() { _ = file.Close() }()

	msg, err := h.svc.PostImage(r.Context(), eventID, userID, r.FormValue("body"), file, header)
	if err != nil {
		observability.FromContext(r.Context()).Error("post chat image", "error", err)
		if strings.Contains(err.Error(), "unsupported image type") {
			response.Error(w, http.StatusBadRequest, err.Error())
			return
		}
		writeErr(w, err, "failed to post image")
		return
	}
	response.JSON(w, http.StatusCreated, msg)
}

// @Summary Delete an event chat message
// @Tags messages
// @Security BearerAuth
// @Param id path string true "Event ID"
// @Param messageId path string true "Message ID"
// @Success 204 "No Content"
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /events/{id}/messages/{messageId} [delete]
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid event id")
		return
	}
	messageID, err := uuid.Parse(chi.URLParam(r, "messageId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid message id")
		return
	}

	if err := h.svc.Delete(r.Context(), eventID, messageID, userID); err != nil {
		writeErr(w, err, "failed to delete message")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// @Summary Mark event chat as read
// @Tags messages
// @Security BearerAuth
// @Param id path string true "Event ID"
// @Success 204 "No Content"
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /events/{id}/messages/read [post]
func (h *Handler) MarkRead(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid event id")
		return
	}

	if err := h.svc.MarkRead(r.Context(), eventID, userID); err != nil {
		writeErr(w, err, "failed to mark chat read")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// @Summary Get event chat unread count
// @Tags messages
// @Produce json
// @Security BearerAuth
// @Param id path string true "Event ID"
// @Success 200 {object} model.UnreadCountResponse
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /events/{id}/messages/unread-count [get]
func (h *Handler) UnreadCount(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid event id")
		return
	}

	count, err := h.svc.UnreadCount(r.Context(), eventID, userID)
	if err != nil {
		writeErr(w, err, "failed to count unread")
		return
	}
	response.JSON(w, http.StatusOK, model.UnreadCountResponse{Count: count})
}

// @Summary Toggle the caller's emoji reaction on a message
// @Tags messages
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Event ID"
// @Param messageId path string true "Message ID"
// @Param request body model.ToggleReactionRequest true "Emoji"
// @Success 200 {object} model.Message
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /events/{id}/messages/{messageId}/reactions [post]
func (h *Handler) ToggleReaction(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid event id")
		return
	}
	messageID, err := uuid.Parse(chi.URLParam(r, "messageId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid message id")
		return
	}
	var req model.ToggleReactionRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	msg, err := h.svc.ToggleReaction(r.Context(), eventID, messageID, userID, req.Emoji)
	if err != nil {
		writeErr(w, err, "failed to toggle reaction")
		return
	}
	response.JSON(w, http.StatusOK, msg)
}
