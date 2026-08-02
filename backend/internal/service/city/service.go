package citysvc

import (
	"context"

	"bimeet/internal/model"
)

type Service struct {
	cityRepo CityRepo
}

func New(cityRepo CityRepo) *Service {
	return &Service{cityRepo: cityRepo}
}

func (s *Service) List(ctx context.Context) ([]model.City, error) {
	return s.cityRepo.ListActive(ctx)
}
