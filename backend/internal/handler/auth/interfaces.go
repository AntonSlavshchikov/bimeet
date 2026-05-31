package authhandler

//go:generate mockgen -destination=mock/mock.go -package=mock . AuthService

import (
	"context"

	"bimeet/internal/model"
)

type AuthService interface {
	RequestCode(ctx context.Context, req model.RequestCodeRequest) error
	VerifyCode(ctx context.Context, req model.VerifyCodeRequest) (model.AuthResponse, error)
}
