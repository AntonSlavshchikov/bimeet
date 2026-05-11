package adminhandler

import (
	"context"
	"net/http"
	"strconv"

	"bimeet/internal/handler/response"
	"bimeet/internal/model"
)

type AdminService interface {
	Overview(ctx context.Context) (model.AdminOverview, error)
	Timeseries(ctx context.Context, days int) (model.AdminTimeseries, error)
	Distribution(ctx context.Context) (model.AdminDistribution, error)
	TopOrganizers(ctx context.Context, limit int) ([]model.OrganizerStat, error)
	RecentUsers(ctx context.Context, limit int) ([]model.AdminUserRow, error)
	RecentEvents(ctx context.Context, limit int) ([]model.AdminEventRow, error)
}

type Handler struct {
	svc AdminService
}

func New(svc AdminService) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Overview(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.Overview(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to load overview")
		return
	}
	response.JSON(w, http.StatusOK, data)
}

func (h *Handler) Timeseries(w http.ResponseWriter, r *http.Request) {
	days := clampInt(parseIntQuery(r, "days", 30), 1, 365)
	data, err := h.svc.Timeseries(r.Context(), days)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to load timeseries")
		return
	}
	response.JSON(w, http.StatusOK, data)
}

func (h *Handler) Distribution(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.Distribution(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to load distribution")
		return
	}
	response.JSON(w, http.StatusOK, data)
}

func (h *Handler) TopOrganizers(w http.ResponseWriter, r *http.Request) {
	limit := clampInt(parseIntQuery(r, "limit", 10), 1, 50)
	data, err := h.svc.TopOrganizers(r.Context(), limit)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to load top organizers")
		return
	}
	response.JSON(w, http.StatusOK, data)
}

func (h *Handler) RecentUsers(w http.ResponseWriter, r *http.Request) {
	limit := clampInt(parseIntQuery(r, "limit", 20), 1, 100)
	data, err := h.svc.RecentUsers(r.Context(), limit)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to load recent users")
		return
	}
	response.JSON(w, http.StatusOK, data)
}

func (h *Handler) RecentEvents(w http.ResponseWriter, r *http.Request) {
	limit := clampInt(parseIntQuery(r, "limit", 20), 1, 100)
	data, err := h.svc.RecentEvents(r.Context(), limit)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to load recent events")
		return
	}
	response.JSON(w, http.StatusOK, data)
}

func parseIntQuery(r *http.Request, key string, def int) int {
	raw := r.URL.Query().Get(key)
	if raw == "" {
		return def
	}
	n, err := strconv.Atoi(raw)
	if err != nil {
		return def
	}
	return n
}

func clampInt(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}
