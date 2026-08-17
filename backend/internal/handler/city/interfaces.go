package cityhandler

//go:generate mockgen -destination=mock/mock.go -package=mock . CityService

import (
	"context"

	"bimeet/internal/model"
)

type CityService interface {
	List(ctx context.Context) ([]model.City, error)
}
