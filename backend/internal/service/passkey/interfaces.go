package passkeysvc

//go:generate mockgen -destination=mock/mock.go -package=mock . PasskeyRepo,UserRepo,SessionIssuer

import (
	"context"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"

	"bimeet/internal/model"
)

type PasskeyRepo interface {
	GetOrCreateHandle(ctx context.Context, userID uuid.UUID, rpID string) ([]byte, error)
	FindUserID(ctx context.Context, rpID string, credentialID, handle []byte) (uuid.UUID, error)
	ListCredentials(ctx context.Context, userID uuid.UUID, rpID string) ([]model.PasskeyCredential, error)
	DecodeCredentials(records []model.PasskeyCredential) ([]webauthn.Credential, error)
	CreateCredential(ctx context.Context, userID uuid.UUID, rpID, name string, credential webauthn.Credential) (model.Passkey, error)
	UpdateCredential(ctx context.Context, userID uuid.UUID, rpID string, credential webauthn.Credential) error
	List(ctx context.Context, userID uuid.UUID, rpID string) ([]model.Passkey, error)
	Count(ctx context.Context, userID uuid.UUID, rpID string) (int, error)
	Rename(ctx context.Context, userID, id uuid.UUID, name string) (bool, error)
	Delete(ctx context.Context, userID, id uuid.UUID) (bool, error)
	CreateCeremony(ctx context.Context, ceremony model.PasskeyCeremony) error
	ConsumeCeremony(ctx context.Context, id uuid.UUID, kind string) (model.PasskeyCeremony, bool, error)
}

type UserRepo interface {
	GetByID(ctx context.Context, id uuid.UUID) (model.User, error)
}

type SessionIssuer interface {
	IssueSession(ctx context.Context, userID uuid.UUID, userAgent string) (accessToken, refreshToken string, err error)
}
