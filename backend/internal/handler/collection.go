package handler

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"meetup/internal/middleware"
	"meetup/internal/model"
	"meetup/internal/service"
)

type CollectionHandler struct {
	collectionService *service.CollectionService
}

func NewCollectionHandler(collectionService *service.CollectionService) *CollectionHandler {
	return &CollectionHandler{collectionService: collectionService}
}

func (h *CollectionHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid event id")
		return
	}

	collections, err := h.collectionService.List(r.Context(), eventID, userID)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			Error(w, http.StatusForbidden, "forbidden")
			return
		}
		Error(w, http.StatusInternalServerError, "failed to list collections")
		return
	}
	if collections == nil {
		collections = []model.Collection{}
	}
	JSON(w, http.StatusOK, collections)
}

func (h *CollectionHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid event id")
		return
	}

	var req model.CreateCollectionRequest
	if err := ParseJSON(r, &req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	col, err := h.collectionService.Create(r.Context(), eventID, userID, req)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			Error(w, http.StatusForbidden, "forbidden")
			return
		}
		if strings.Contains(msg, "not found") {
			Error(w, http.StatusNotFound, msg)
			return
		}
		Error(w, http.StatusBadRequest, msg)
		return
	}

	JSON(w, http.StatusCreated, col)
}

func (h *CollectionHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid event id")
		return
	}

	collectionID, err := uuid.Parse(chi.URLParam(r, "collectionId"))
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid collection id")
		return
	}

	if err := h.collectionService.Delete(r.Context(), eventID, collectionID, userID); err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			Error(w, http.StatusForbidden, "forbidden")
			return
		}
		if strings.Contains(msg, "not found") {
			Error(w, http.StatusNotFound, msg)
			return
		}
		Error(w, http.StatusInternalServerError, "failed to delete collection")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *CollectionHandler) ToggleContribution(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid event id")
		return
	}

	collectionID, err := uuid.Parse(chi.URLParam(r, "collectionId"))
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid collection id")
		return
	}

	contrib, err := h.collectionService.ToggleContribution(r.Context(), eventID, collectionID, userID)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			Error(w, http.StatusForbidden, "forbidden")
			return
		}
		if strings.Contains(msg, "not found") {
			Error(w, http.StatusNotFound, msg)
			return
		}
		Error(w, http.StatusInternalServerError, "failed to toggle contribution")
		return
	}

	JSON(w, http.StatusOK, contrib)
}

func (h *CollectionHandler) Summary(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromCtx(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid event id")
		return
	}

	summary, err := h.collectionService.Summary(r.Context(), eventID, userID)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "forbidden") {
			Error(w, http.StatusForbidden, "forbidden")
			return
		}
		Error(w, http.StatusInternalServerError, "failed to get summary")
		return
	}

	JSON(w, http.StatusOK, summary)
}
