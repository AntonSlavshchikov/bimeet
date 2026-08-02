package citysvc

//go:generate mockgen -destination=mock/mock.go -package=mock . CityRepo

import (
	"context"

	"bimeet/internal/model"
)

type CityRepo interface {
	ListActive(ctx context.Context) ([]model.City, error)
}
