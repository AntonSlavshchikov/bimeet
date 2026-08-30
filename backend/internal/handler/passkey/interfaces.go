package passkeyhandler

//go:generate mockgen -destination=mock/mock.go -package=mock . PasskeyService

import (
	"context"

	"github.com/google/uuid"

	"bimeet/internal/model"
)

type PasskeyService interface {
	Config() model.PasskeyConfigResponse
	BeginLogin(ctx context.Context, mediation string) (model.PasskeyOptionsResponse, error)
	FinishLogin(ctx context.Context, req model.PasskeyVerifyRequest, userAgent string) (model.AuthResponse, error)
	BeginRegistration(ctx context.Context, userID uuid.UUID) (model.PasskeyOptionsResponse, error)
	FinishRegistration(ctx context.Context, userID uuid.UUID, req model.PasskeyVerifyRequest) (model.Passkey, error)
	List(ctx context.Context, userID uuid.UUID) ([]model.Passkey, error)
	Rename(ctx context.Context, userID, id uuid.UUID, req model.RenamePasskeyRequest) (model.Passkey, error)
	Delete(ctx context.Context, userID, id uuid.UUID) error
}
