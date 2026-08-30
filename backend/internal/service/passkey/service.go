package passkeysvc

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/url"
	"strings"
	"time"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"

	"bimeet/internal/model"
	"bimeet/internal/observability"
)

const (
	ceremonyTTL = 5 * time.Minute
	maxPasskeys = 10
)

var (
	ErrDisabled         = errors.New("passkeys are disabled")
	ErrInvalidCeremony  = errors.New("invalid or expired passkey ceremony")
	ErrVerification     = errors.New("passkey verification failed")
	ErrDuplicate        = errors.New("passkey already registered")
	ErrLimit            = errors.New("passkey limit reached")
	ErrNotFound         = errors.New("passkey not found")
	ErrInvalidName      = errors.New("passkey name must be between 1 and 64 characters")
	ErrInvalidMediation = errors.New("invalid passkey mediation")
)

type Service struct {
	enabled bool
	rpID    string
	web     *webauthn.WebAuthn
	repo    PasskeyRepo
	users   UserRepo
	issuer  SessionIssuer
}

func New(enabled bool, rpID, displayName string, origins []string, repo PasskeyRepo, users UserRepo, issuer SessionIssuer) (*Service, error) {
	service := &Service{enabled: enabled, rpID: rpID, repo: repo, users: users, issuer: issuer}
	if !enabled {
		return service, nil
	}
	if err := validateRelyingParty(rpID, origins); err != nil {
		return nil, err
	}
	web, err := webauthn.New(&webauthn.Config{
		RPID:                  rpID,
		RPDisplayName:         displayName,
		RPOrigins:             origins,
		AttestationPreference: protocol.PreferNoAttestation,
		AuthenticatorSelection: protocol.AuthenticatorSelection{
			ResidentKey:        protocol.ResidentKeyRequirementRequired,
			RequireResidentKey: protocol.ResidentKeyRequired(),
			UserVerification:   protocol.VerificationRequired,
		},
		Timeouts: webauthn.TimeoutsConfig{
			Login:        webauthn.TimeoutConfig{Enforce: true, Timeout: ceremonyTTL, TimeoutUVD: ceremonyTTL},
			Registration: webauthn.TimeoutConfig{Enforce: true, Timeout: ceremonyTTL, TimeoutUVD: ceremonyTTL},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("initialize WebAuthn: %w", err)
	}
	service.web = web
	return service, nil
}

func validateRelyingParty(rpID string, origins []string) error {
	if rpID == "" || strings.ContainsAny(rpID, "/: ") {
		return fmt.Errorf("invalid WebAuthn RP ID")
	}
	if len(origins) == 0 {
		return fmt.Errorf("at least one WebAuthn origin is required")
	}
	for _, raw := range origins {
		origin, err := url.Parse(raw)
		if err != nil || origin.Hostname() == "" || origin.User != nil || origin.RawQuery != "" || origin.Fragment != "" || (origin.Path != "" && origin.Path != "/") {
			return fmt.Errorf("invalid WebAuthn origin")
		}
		hostname := strings.ToLower(origin.Hostname())
		if hostname != rpID && !strings.HasSuffix(hostname, "."+rpID) {
			return fmt.Errorf("WebAuthn origin is outside RP ID")
		}
		if origin.Scheme != "https" {
			ip := net.ParseIP(hostname)
			if origin.Scheme != "http" || (hostname != "localhost" && (ip == nil || !ip.IsLoopback())) {
				return fmt.Errorf("WebAuthn origin must use HTTPS")
			}
		}
	}
	return nil
}

func (s *Service) Config() model.PasskeyConfigResponse {
	return model.PasskeyConfigResponse{Enabled: s.enabled}
}

func (s *Service) BeginLogin(ctx context.Context, mediation string) (model.PasskeyOptionsResponse, error) {
	if err := s.requireEnabled(); err != nil {
		return model.PasskeyOptionsResponse{}, err
	}
	var (
		options *protocol.CredentialAssertion
		session *webauthn.SessionData
		err     error
	)
	switch mediation {
	case "", "default":
		options, session, err = s.web.BeginDiscoverableLogin(webauthn.WithUserVerification(protocol.VerificationRequired))
	case "conditional":
		options, session, err = s.web.BeginDiscoverableMediatedLogin(
			protocol.MediationConditional,
			webauthn.WithUserVerification(protocol.VerificationRequired),
		)
	default:
		return model.PasskeyOptionsResponse{}, ErrInvalidMediation
	}
	if err != nil {
		return model.PasskeyOptionsResponse{}, fmt.Errorf("begin passkey login: %w", err)
	}
	ceremony, err := newCeremony("authentication", nil, session)
	if err != nil {
		return model.PasskeyOptionsResponse{}, err
	}
	if err := s.repo.CreateCeremony(ctx, ceremony); err != nil {
		return model.PasskeyOptionsResponse{}, err
	}
	observability.FromContext(ctx).Info("passkey ceremony begun", "kind", "authentication", "mediation", mediation)
	// Browser helpers expect PublicKeyCredentialRequestOptionsJSON directly,
	// not the WebAuthn specification's top-level { publicKey: ... } wrapper.
	return model.PasskeyOptionsResponse{CeremonyID: ceremony.ID, Options: options.Response}, nil
}

func (s *Service) FinishLogin(ctx context.Context, req model.PasskeyVerifyRequest, userAgent string) (model.AuthResponse, error) {
	if err := s.requireEnabled(); err != nil {
		return model.AuthResponse{}, err
	}
	_, session, err := s.consumeSession(ctx, req.CeremonyID, "authentication", nil)
	if err != nil {
		observability.FromContext(ctx).Warn("passkey ceremony failed", "kind", "authentication", "reason", "ceremony")
		return model.AuthResponse{}, err
	}
	parsed, err := protocol.ParseCredentialRequestResponseBytes(req.Credential)
	if err != nil {
		observability.FromContext(ctx).Warn("passkey ceremony failed", "kind", "authentication", "reason", "invalid_response")
		return model.AuthResponse{}, ErrVerification
	}
	var resolved model.PasskeyUser
	user, credential, err := s.web.ValidatePasskeyLogin(func(rawID, userHandle []byte) (webauthn.User, error) {
		userID, err := s.repo.FindUserID(ctx, s.rpID, rawID, userHandle)
		if err != nil {
			return nil, err
		}
		resolved, err = s.loadUser(ctx, userID, userHandle)
		if err != nil {
			return nil, err
		}
		return resolved, nil
	}, session, parsed)
	if err != nil {
		observability.FromContext(ctx).Warn("passkey verification failed", "kind", "authentication")
		return model.AuthResponse{}, ErrVerification
	}
	validated, ok := user.(model.PasskeyUser)
	if !ok || validated.User.ID == uuid.Nil || resolved.User.ID != validated.User.ID {
		return model.AuthResponse{}, ErrVerification
	}
	if err := s.repo.UpdateCredential(ctx, validated.User.ID, s.rpID, *credential); err != nil {
		return model.AuthResponse{}, err
	}
	if credential.Authenticator.CloneWarning {
		observability.FromContext(ctx).Warn("passkey clone warning")
	}
	accessToken, refreshToken, err := s.issuer.IssueSession(ctx, validated.User.ID, userAgent)
	if err != nil {
		return model.AuthResponse{}, err
	}
	observability.FromContext(ctx).Info("passkey ceremony succeeded", "kind", "authentication")
	return model.AuthResponse{
		Token: accessToken, RefreshToken: refreshToken, User: validated.User, HasPasskeys: true,
	}, nil
}

func (s *Service) BeginRegistration(ctx context.Context, userID uuid.UUID) (model.PasskeyOptionsResponse, error) {
	if err := s.requireEnabled(); err != nil {
		return model.PasskeyOptionsResponse{}, err
	}
	count, err := s.repo.Count(ctx, userID, s.rpID)
	if err != nil {
		return model.PasskeyOptionsResponse{}, err
	}
	if count >= maxPasskeys {
		return model.PasskeyOptionsResponse{}, ErrLimit
	}
	handle, err := s.repo.GetOrCreateHandle(ctx, userID, s.rpID)
	if err != nil {
		return model.PasskeyOptionsResponse{}, err
	}
	user, err := s.loadUser(ctx, userID, handle)
	if err != nil {
		return model.PasskeyOptionsResponse{}, err
	}
	options, session, err := s.web.BeginRegistration(
		user,
		webauthn.WithResidentKeyRequirement(protocol.ResidentKeyRequirementRequired),
		webauthn.WithConveyancePreference(protocol.PreferNoAttestation),
		webauthn.WithExclusions(webauthn.Credentials(user.Credentials).CredentialDescriptors()),
	)
	if err != nil {
		return model.PasskeyOptionsResponse{}, fmt.Errorf("begin passkey registration: %w", err)
	}
	ceremony, err := newCeremony("registration", &userID, session)
	if err != nil {
		return model.PasskeyOptionsResponse{}, err
	}
	if err := s.repo.CreateCeremony(ctx, ceremony); err != nil {
		return model.PasskeyOptionsResponse{}, err
	}
	observability.FromContext(ctx).Info("passkey ceremony begun", "kind", "registration")
	// @simplewebauthn/browser expects PublicKeyCredentialCreationOptionsJSON
	// directly, not the protocol.CredentialCreation wrapper.
	return model.PasskeyOptionsResponse{CeremonyID: ceremony.ID, Options: options.Response}, nil
}

func (s *Service) FinishRegistration(ctx context.Context, userID uuid.UUID, req model.PasskeyVerifyRequest) (model.Passkey, error) {
	if err := s.requireEnabled(); err != nil {
		return model.Passkey{}, err
	}
	_, session, err := s.consumeSession(ctx, req.CeremonyID, "registration", &userID)
	if err != nil {
		observability.FromContext(ctx).Warn("passkey ceremony failed", "kind", "registration", "reason", "ceremony")
		return model.Passkey{}, err
	}
	handle, err := s.repo.GetOrCreateHandle(ctx, userID, s.rpID)
	if err != nil {
		return model.Passkey{}, err
	}
	user, err := s.loadUser(ctx, userID, handle)
	if err != nil {
		return model.Passkey{}, err
	}
	parsed, err := protocol.ParseCredentialCreationResponseBytes(req.Credential)
	if err != nil {
		observability.FromContext(ctx).Warn("passkey ceremony failed", "kind", "registration", "reason", "invalid_response")
		return model.Passkey{}, ErrVerification
	}
	credential, err := s.web.CreateCredential(user, session, parsed)
	if err != nil {
		observability.FromContext(ctx).Warn("passkey ceremony failed", "kind", "registration", "reason", "verification")
		return model.Passkey{}, ErrVerification
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = "Passkey · " + time.Now().Format("02.01.2006")
	}
	if err := validateName(name); err != nil {
		return model.Passkey{}, err
	}
	passkey, err := s.repo.CreateCredential(ctx, userID, s.rpID, name, *credential)
	if err != nil {
		if strings.Contains(err.Error(), "passkey credential limit reached") {
			return model.Passkey{}, ErrLimit
		}
		if strings.Contains(err.Error(), "already registered") {
			return model.Passkey{}, ErrDuplicate
		}
		return model.Passkey{}, err
	}
	observability.FromContext(ctx).Info("passkey ceremony succeeded", "kind", "registration")
	return passkey, nil
}

func (s *Service) List(ctx context.Context, userID uuid.UUID) ([]model.Passkey, error) {
	if err := s.requireEnabled(); err != nil {
		return nil, err
	}
	return s.repo.List(ctx, userID, s.rpID)
}

func (s *Service) Rename(ctx context.Context, userID, id uuid.UUID, req model.RenamePasskeyRequest) (model.Passkey, error) {
	if err := s.requireEnabled(); err != nil {
		return model.Passkey{}, err
	}
	name := strings.TrimSpace(req.Name)
	if err := validateName(name); err != nil {
		return model.Passkey{}, err
	}
	ok, err := s.repo.Rename(ctx, userID, id, name)
	if err != nil {
		return model.Passkey{}, err
	}
	if !ok {
		return model.Passkey{}, ErrNotFound
	}
	items, err := s.repo.List(ctx, userID, s.rpID)
	if err != nil {
		return model.Passkey{}, err
	}
	for _, item := range items {
		if item.ID == id {
			return item, nil
		}
	}
	return model.Passkey{}, ErrNotFound
}

func (s *Service) Delete(ctx context.Context, userID, id uuid.UUID) error {
	if err := s.requireEnabled(); err != nil {
		return err
	}
	ok, err := s.repo.Delete(ctx, userID, id)
	if err != nil {
		return err
	}
	if !ok {
		return ErrNotFound
	}
	return nil
}

func (s *Service) HasPasskeys(ctx context.Context, userID uuid.UUID) (bool, error) {
	if !s.enabled {
		return false, nil
	}
	count, err := s.repo.Count(ctx, userID, s.rpID)
	return count > 0, err
}

func (s *Service) loadUser(ctx context.Context, userID uuid.UUID, handle []byte) (model.PasskeyUser, error) {
	user, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return model.PasskeyUser{}, err
	}
	records, err := s.repo.ListCredentials(ctx, userID, s.rpID)
	if err != nil {
		return model.PasskeyUser{}, err
	}
	credentials, err := s.repo.DecodeCredentials(records)
	if err != nil {
		return model.PasskeyUser{}, err
	}
	return model.PasskeyUser{User: user, Handle: handle, Credentials: credentials}, nil
}

func (s *Service) consumeSession(ctx context.Context, id uuid.UUID, kind string, expectedUserID *uuid.UUID) (model.PasskeyCeremony, webauthn.SessionData, error) {
	if id == uuid.Nil {
		return model.PasskeyCeremony{}, webauthn.SessionData{}, ErrInvalidCeremony
	}
	ceremony, found, err := s.repo.ConsumeCeremony(ctx, id, kind)
	if err != nil {
		return model.PasskeyCeremony{}, webauthn.SessionData{}, err
	}
	if !found {
		return model.PasskeyCeremony{}, webauthn.SessionData{}, ErrInvalidCeremony
	}
	if expectedUserID != nil && (ceremony.UserID == nil || *ceremony.UserID != *expectedUserID) {
		return model.PasskeyCeremony{}, webauthn.SessionData{}, ErrInvalidCeremony
	}
	var session webauthn.SessionData
	if err := json.Unmarshal(ceremony.SessionData, &session); err != nil {
		return model.PasskeyCeremony{}, webauthn.SessionData{}, ErrInvalidCeremony
	}
	if session.RelyingPartyID != s.rpID {
		return model.PasskeyCeremony{}, webauthn.SessionData{}, ErrInvalidCeremony
	}
	return ceremony, session, nil
}

func newCeremony(kind string, userID *uuid.UUID, session *webauthn.SessionData) (model.PasskeyCeremony, error) {
	encoded, err := json.Marshal(session)
	if err != nil {
		return model.PasskeyCeremony{}, fmt.Errorf("encode passkey ceremony: %w", err)
	}
	return model.PasskeyCeremony{
		ID: uuid.New(), Kind: kind, UserID: userID, SessionData: encoded, ExpiresAt: time.Now().Add(ceremonyTTL),
	}, nil
}

func validateName(name string) error {
	if len([]rune(name)) == 0 || len([]rune(name)) > 64 {
		return ErrInvalidName
	}
	return nil
}

func (s *Service) requireEnabled() error {
	if !s.enabled {
		return ErrDisabled
	}
	return nil
}
