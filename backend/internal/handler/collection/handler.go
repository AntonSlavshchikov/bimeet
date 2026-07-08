package collectionhandler

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"bimeet/internal/handler/response"
	"bimeet/internal/middleware"
	"bimeet/internal/model"
	"bimeet/internal/observability"
)

type Handler struct {
	svc CollectionService
}

func New(svc CollectionService) *Handler {
	return &Handler{svc: svc}
}

// @Summary List event collections
// @Tags collections
// @Produce json
// @Security BearerAuth
// @Param id path string true "Event ID"
// @Success 200 {array} model.Collection
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /events/{id}/collections [get]
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

	collections, err := h.svc.List(r.Context(), eventID, userID)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			response.Error(w, http.StatusForbidden, "forbidden")
			return
		}
		response.Error(w, http.StatusInternalServerError, "failed to list collections")
		return
	}
	if collections == nil {
		collections = []model.Collection{}
	}
	response.JSON(w, http.StatusOK, collections)
}

// @Summary Create an event collection
// @Tags collections
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Event ID"
// @Param request body model.CreateCollectionRequest true "Collection payload"
// @Success 201 {object} model.Collection
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /events/{id}/collections [post]
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
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

	var req model.CreateCollectionRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	col, err := h.svc.Create(r.Context(), eventID, userID, req)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			response.Error(w, http.StatusForbidden, "forbidden")
			return
		}
		if strings.Contains(msg, "not found") {
			response.Error(w, http.StatusNotFound, msg)
			return
		}
		response.Error(w, http.StatusBadRequest, msg)
		return
	}

	response.JSON(w, http.StatusCreated, col)
}

// @Summary Delete an event collection
// @Tags collections
// @Security BearerAuth
// @Param id path string true "Event ID"
// @Param collectionId path string true "Collection ID"
// @Success 204 "No Content"
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /events/{id}/collections/{collectionId} [delete]
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

	collectionID, err := uuid.Parse(chi.URLParam(r, "collectionId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid collection id")
		return
	}

	if err := h.svc.Delete(r.Context(), eventID, collectionID, userID); err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			response.Error(w, http.StatusForbidden, "forbidden")
			return
		}
		if strings.Contains(msg, "not found") {
			response.Error(w, http.StatusNotFound, msg)
			return
		}
		response.Error(w, http.StatusInternalServerError, "failed to delete collection")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

const (
	maxReceiptSize        = 10 << 20 // 10 MB
	maxReceiptRequestSize = maxReceiptSize + 1<<20
)

// @Summary Submit a collection contribution receipt
// @Tags collections
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param id path string true "Event ID"
// @Param collectionId path string true "Collection ID"
// @Param receipt formData file true "Receipt file"
// @Success 200 {object} model.CollectionContribution
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 409 {object} response.ErrorResponse
// @Failure 503 {object} response.ErrorResponse
// @Router /events/{id}/collections/{collectionId}/contribute [post]
func (h *Handler) SubmitContribution(w http.ResponseWriter, r *http.Request) {
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

	collectionID, err := uuid.Parse(chi.URLParam(r, "collectionId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid collection id")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxReceiptRequestSize)
	if err := r.ParseMultipartForm(maxReceiptSize); err != nil {
		response.Error(w, http.StatusBadRequest, "file too large or invalid form")
		return
	}

	file, header, err := r.FormFile("receipt")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "receipt file is required")
		return
	}
	defer func() { _ = file.Close() }()

	contrib, err := h.svc.SubmitContribution(r.Context(), eventID, collectionID, userID, file, header)
	if err != nil {
		observability.FromContext(r.Context()).Error("submit contribution", "error", err)
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			response.Error(w, http.StatusForbidden, msg)
			return
		}
		if strings.Contains(msg, "not found") {
			response.Error(w, http.StatusNotFound, msg)
			return
		}
		if strings.Contains(msg, "already paid") {
			response.Error(w, http.StatusConflict, msg)
			return
		}
		if strings.Contains(msg, "unsupported file type") {
			response.Error(w, http.StatusBadRequest, msg)
			return
		}
		if strings.Contains(msg, "not configured") {
			response.Error(w, http.StatusServiceUnavailable, "receipt storage is not configured")
			return
		}
		response.Error(w, http.StatusInternalServerError, "failed to submit contribution")
		return
	}

	response.JSON(w, http.StatusOK, contrib)
}

// @Summary Confirm a collection contribution
// @Tags collections
// @Produce json
// @Security BearerAuth
// @Param id path string true "Event ID"
// @Param collectionId path string true "Collection ID"
// @Param contribId path string true "Contribution ID"
// @Success 200 {object} model.CollectionContribution
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /events/{id}/collections/{collectionId}/contributions/{contribId}/confirm [post]
func (h *Handler) ConfirmContribution(w http.ResponseWriter, r *http.Request) {
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

	collectionID, err := uuid.Parse(chi.URLParam(r, "collectionId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid collection id")
		return
	}

	contribID, err := uuid.Parse(chi.URLParam(r, "contribId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid contribution id")
		return
	}

	contrib, err := h.svc.ConfirmContribution(r.Context(), eventID, collectionID, contribID, userID)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			response.Error(w, http.StatusForbidden, "forbidden")
			return
		}
		if strings.Contains(msg, "not found") {
			response.Error(w, http.StatusNotFound, msg)
			return
		}
		response.Error(w, http.StatusBadRequest, msg)
		return
	}

	response.JSON(w, http.StatusOK, contrib)
}

// @Summary Reject a collection contribution
// @Tags collections
// @Produce json
// @Security BearerAuth
// @Param id path string true "Event ID"
// @Param collectionId path string true "Collection ID"
// @Param contribId path string true "Contribution ID"
// @Success 200 {object} model.CollectionContribution
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /events/{id}/collections/{collectionId}/contributions/{contribId}/reject [post]
func (h *Handler) RejectContribution(w http.ResponseWriter, r *http.Request) {
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

	collectionID, err := uuid.Parse(chi.URLParam(r, "collectionId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid collection id")
		return
	}

	contribID, err := uuid.Parse(chi.URLParam(r, "contribId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid contribution id")
		return
	}

	contrib, err := h.svc.RejectContribution(r.Context(), eventID, collectionID, contribID, userID)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			response.Error(w, http.StatusForbidden, "forbidden")
			return
		}
		if strings.Contains(msg, "not found") {
			response.Error(w, http.StatusNotFound, msg)
			return
		}
		response.Error(w, http.StatusBadRequest, msg)
		return
	}

	response.JSON(w, http.StatusOK, contrib)
}

// @Summary Mark the organizer's contribution as paid
// @Tags collections
// @Produce json
// @Security BearerAuth
// @Param id path string true "Event ID"
// @Param collectionId path string true "Collection ID"
// @Success 200 {object} model.CollectionContribution
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /events/{id}/collections/{collectionId}/contributions/mark-paid [post]
func (h *Handler) MarkPaid(w http.ResponseWriter, r *http.Request) {
	// The organizer marks their own contribution as paid; the target is the
	// caller, taken from the JWT rather than the request body.
	organizerID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid event id")
		return
	}

	collectionID, err := uuid.Parse(chi.URLParam(r, "collectionId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid collection id")
		return
	}

	contrib, err := h.svc.MarkPaid(r.Context(), eventID, collectionID, organizerID, organizerID)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			response.Error(w, http.StatusForbidden, "forbidden")
			return
		}
		if strings.Contains(msg, "not found") {
			response.Error(w, http.StatusNotFound, msg)
			return
		}
		response.Error(w, http.StatusBadRequest, msg)
		return
	}

	response.JSON(w, http.StatusOK, contrib)
}

// @Summary Get event collections summary
// @Tags collections
// @Produce json
// @Security BearerAuth
// @Param id path string true "Event ID"
// @Success 200 {object} model.EventCollectionsSummaryResponse
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /events/{id}/collections/summary [get]
func (h *Handler) Summary(w http.ResponseWriter, r *http.Request) {
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

	summary, err := h.svc.Summary(r.Context(), eventID, userID)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			response.Error(w, http.StatusForbidden, "forbidden")
			return
		}
		response.Error(w, http.StatusInternalServerError, "failed to get summary")
		return
	}

	response.JSON(w, http.StatusOK, summary)
}
