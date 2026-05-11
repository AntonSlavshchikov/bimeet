package adminsvc

import (
	"context"

	"bimeet/internal/model"
)

// Repo is the minimal interface the admin service needs from its repository.
type Repo interface {
	Overview(ctx context.Context) (model.AdminOverview, error)
	Timeseries(ctx context.Context, days int) (model.AdminTimeseries, error)
	Distribution(ctx context.Context) (model.AdminDistribution, error)
	TopOrganizers(ctx context.Context, limit int) ([]model.OrganizerStat, error)
	RecentUsers(ctx context.Context, limit int) ([]model.AdminUserRow, error)
	RecentEvents(ctx context.Context, limit int) ([]model.AdminEventRow, error)
}

type Service struct {
	repo Repo
}

func New(repo Repo) *Service {
	return &Service{repo: repo}
}

func (s *Service) Overview(ctx context.Context) (model.AdminOverview, error) {
	return s.repo.Overview(ctx)
}

func (s *Service) Timeseries(ctx context.Context, days int) (model.AdminTimeseries, error) {
	return s.repo.Timeseries(ctx, days)
}

func (s *Service) Distribution(ctx context.Context) (model.AdminDistribution, error) {
	return s.repo.Distribution(ctx)
}

func (s *Service) TopOrganizers(ctx context.Context, limit int) ([]model.OrganizerStat, error) {
	return s.repo.TopOrganizers(ctx, limit)
}

func (s *Service) RecentUsers(ctx context.Context, limit int) ([]model.AdminUserRow, error) {
	return s.repo.RecentUsers(ctx, limit)
}

func (s *Service) RecentEvents(ctx context.Context, limit int) ([]model.AdminEventRow, error) {
	return s.repo.RecentEvents(ctx, limit)
}
