package itemhandler

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"bimeet/internal/handler/response"
	"bimeet/internal/middleware"
	"bimeet/internal/model"
)

type Handler struct {
	svc ItemService
}

func New(svc ItemService) *Handler {
	return &Handler{svc: svc}
}

// @Summary List event items
// @Tags items
// @Produce json
// @Security BearerAuth
// @Param id path string true "Event ID"
// @Success 200 {array} model.Item
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /events/{id}/items [get]
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

	items, err := h.svc.List(r.Context(), eventID, userID)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			response.Error(w, http.StatusForbidden, "forbidden")
			return
		}
		response.Error(w, http.StatusInternalServerError, "failed to list items")
		return
	}
	if items == nil {
		items = []model.Item{}
	}
	response.JSON(w, http.StatusOK, items)
}

// @Summary Create an event item
// @Tags items
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Event ID"
// @Param request body model.CreateItemRequest true "Item payload"
// @Success 201 {object} model.Item
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Router /events/{id}/items [post]
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

	var req model.CreateItemRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	item, err := h.svc.Create(r.Context(), eventID, userID, req)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			response.Error(w, http.StatusForbidden, "forbidden")
			return
		}
		response.Error(w, http.StatusBadRequest, msg)
		return
	}

	response.JSON(w, http.StatusCreated, item)
}

// @Summary Assign or unassign an event item
// @Tags items
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Event ID"
// @Param itemId path string true "Item ID"
// @Param request body model.UpdateItemRequest true "Assignment payload"
// @Success 200 {object} model.Item
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /events/{id}/items/{itemId} [patch]
func (h *Handler) UpdateAssignment(w http.ResponseWriter, r *http.Request) {
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

	itemID, err := uuid.Parse(chi.URLParam(r, "itemId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid item id")
		return
	}

	var req model.UpdateItemRequest
	if err := response.ParseJSON(r, &req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	item, err := h.svc.UpdateAssignment(r.Context(), eventID, itemID, userID, req)
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
		response.Error(w, http.StatusInternalServerError, "failed to update item")
		return
	}

	response.JSON(w, http.StatusOK, item)
}
