// Package fileshandler serves GET /api/files/{key}: a 302 redirect to a
// freshly presigned S3 GET URL. The bucket itself is private — this route
// is the only way the frontend reaches a stored file, and it exists so a
// short presign TTL never shows up as a broken image: the browser always
// hits this stable path, which mints a new presigned URL on every request
// (see storage.FileURL / storage.S3Storage.PresignGet).
//
// This route is deliberately public (no participant/auth check), matching
// the access model the bucket had before migration: anyone who knows an
// object's key can view it. Tightening that is a separate decision, not
// something this migration changes.
package fileshandler

import (
	"context"
	"net/http"
	"strings"

	"bimeet/internal/handler/response"
)

// Presigner is the subset of storage.S3Storage this handler needs.
type Presigner interface {
	PresignGet(ctx context.Context, key string) (string, error)
}

type Handler struct {
	storage Presigner
}

func New(storage Presigner) *Handler {
	return &Handler{storage: storage}
}

// Get redirects to a presigned GET URL for the key in the request path
// (everything after /api/files/, which may itself contain slashes).
//
// @Summary Redirect to a stored file
// @Tags files
// @Param key path string true "Object key, e.g. avatars/<uuid>.jpg"
// @Success 302 "Redirect to a presigned S3 URL"
// @Failure 400 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /files/{key} [get]
func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	key := strings.TrimPrefix(r.URL.Path, "/api/files/")
	if key == "" {
		response.Error(w, http.StatusBadRequest, "missing file key")
		return
	}

	url, err := h.storage.PresignGet(r.Context(), key)
	if err != nil {
		response.Error(w, http.StatusNotFound, "file not found")
		return
	}

	// Never cache the redirect itself — each hit must mint a fresh
	// presigned URL, not reuse one that may already be close to expiring.
	w.Header().Set("Cache-Control", "no-store")
	http.Redirect(w, r, url, http.StatusFound)
}
