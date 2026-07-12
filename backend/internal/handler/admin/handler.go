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

// @Summary Get admin overview metrics
// @Tags admin
// @Produce json
// @Security BearerAuth
// @Success 200 {object} model.AdminOverview
// @Failure 500 {object} response.ErrorResponse
// @Router /admin/overview [get]
func (h *Handler) Overview(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.Overview(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to load overview")
		return
	}
	response.JSON(w, http.StatusOK, data)
}

// @Summary Get admin user and event timeseries
// @Tags admin
// @Produce json
// @Security BearerAuth
// @Param days query int false "Number of days, clamped to 1..365"
// @Success 200 {object} model.AdminTimeseries
// @Failure 500 {object} response.ErrorResponse
// @Router /admin/timeseries [get]
func (h *Handler) Timeseries(w http.ResponseWriter, r *http.Request) {
	days := clampInt(parseIntQuery(r, "days", 30), 1, 365)
	data, err := h.svc.Timeseries(r.Context(), days)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to load timeseries")
		return
	}
	response.JSON(w, http.StatusOK, data)
}

// @Summary Get admin event distribution metrics
// @Tags admin
// @Produce json
// @Security BearerAuth
// @Success 200 {object} model.AdminDistribution
// @Failure 500 {object} response.ErrorResponse
// @Router /admin/distribution [get]
func (h *Handler) Distribution(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.Distribution(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to load distribution")
		return
	}
	response.JSON(w, http.StatusOK, data)
}

// @Summary Get top event organizers
// @Tags admin
// @Produce json
// @Security BearerAuth
// @Param limit query int false "Maximum number of organizers, clamped to 1..50"
// @Success 200 {array} model.OrganizerStat
// @Failure 500 {object} response.ErrorResponse
// @Router /admin/top-organizers [get]
func (h *Handler) TopOrganizers(w http.ResponseWriter, r *http.Request) {
	limit := clampInt(parseIntQuery(r, "limit", 10), 1, 50)
	data, err := h.svc.TopOrganizers(r.Context(), limit)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to load top organizers")
		return
	}
	response.JSON(w, http.StatusOK, data)
}

// @Summary Get recently registered users
// @Tags admin
// @Produce json
// @Security BearerAuth
// @Param limit query int false "Maximum number of users, clamped to 1..100"
// @Success 200 {array} model.AdminUserRow
// @Failure 500 {object} response.ErrorResponse
// @Router /admin/recent-users [get]
func (h *Handler) RecentUsers(w http.ResponseWriter, r *http.Request) {
	limit := clampInt(parseIntQuery(r, "limit", 20), 1, 100)
	data, err := h.svc.RecentUsers(r.Context(), limit)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to load recent users")
		return
	}
	response.JSON(w, http.StatusOK, data)
}

// @Summary Get recently created events
// @Tags admin
// @Produce json
// @Security BearerAuth
// @Param limit query int false "Maximum number of events, clamped to 1..100"
// @Success 200 {array} model.AdminEventRow
// @Failure 500 {object} response.ErrorResponse
// @Router /admin/recent-events [get]
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
