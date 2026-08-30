package passkeysvc

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"

	"bimeet/internal/model"
)

type ceremonyRepo struct {
	ceremonies map[uuid.UUID]model.PasskeyCeremony
	count      int
}

type staticUserRepo struct{ user model.User }

func (r staticUserRepo) GetByID(context.Context, uuid.UUID) (model.User, error) { return r.user, nil }

func (r *ceremonyRepo) GetOrCreateHandle(context.Context, uuid.UUID, string) ([]byte, error) {
	return make([]byte, 32), nil
}
func (r *ceremonyRepo) FindUserID(context.Context, string, []byte, []byte) (uuid.UUID, error) {
	return uuid.Nil, errors.New("not found")
}
func (r *ceremonyRepo) ListCredentials(context.Context, uuid.UUID, string) ([]model.PasskeyCredential, error) {
	return nil, nil
}
func (r *ceremonyRepo) DecodeCredentials([]model.PasskeyCredential) ([]webauthn.Credential, error) {
	return nil, nil
}
func (r *ceremonyRepo) CreateCredential(context.Context, uuid.UUID, string, string, webauthn.Credential) (model.Passkey, error) {
	return model.Passkey{}, nil
}
func (r *ceremonyRepo) UpdateCredential(context.Context, uuid.UUID, string, webauthn.Credential) error {
	return nil
}
func (r *ceremonyRepo) List(context.Context, uuid.UUID, string) ([]model.Passkey, error) {
	return nil, nil
}
func (r *ceremonyRepo) Count(context.Context, uuid.UUID, string) (int, error) { return r.count, nil }
func (r *ceremonyRepo) Rename(context.Context, uuid.UUID, uuid.UUID, string) (bool, error) {
	return false, nil
}
func (r *ceremonyRepo) Delete(context.Context, uuid.UUID, uuid.UUID) (bool, error) {
	return false, nil
}
func (r *ceremonyRepo) CreateCeremony(_ context.Context, ceremony model.PasskeyCeremony) error {
	if r.ceremonies == nil {
		r.ceremonies = make(map[uuid.UUID]model.PasskeyCeremony)
	}
	r.ceremonies[ceremony.ID] = ceremony
	return nil
}
func (r *ceremonyRepo) ConsumeCeremony(_ context.Context, id uuid.UUID, kind string) (model.PasskeyCeremony, bool, error) {
	ceremony, ok := r.ceremonies[id]
	if !ok || ceremony.Kind != kind || !ceremony.ExpiresAt.After(time.Now()) {
		return model.PasskeyCeremony{}, false, nil
	}
	delete(r.ceremonies, id)
	return ceremony, true, nil
}

func TestCeremonyIsOneTimeAndBoundToUser(t *testing.T) {
	owner := uuid.New()
	other := uuid.New()
	ceremony, err := newCeremony("registration", &owner, &webauthn.SessionData{Challenge: "challenge"})
	if err != nil {
		t.Fatal(err)
	}
	repo := &ceremonyRepo{ceremonies: map[uuid.UUID]model.PasskeyCeremony{ceremony.ID: ceremony}}
	service := &Service{enabled: true, repo: repo}

	if _, _, err := service.consumeSession(context.Background(), ceremony.ID, "registration", &other); !errors.Is(err, ErrInvalidCeremony) {
		t.Fatalf("registration was not bound to its user: %v", err)
	}
	if _, _, err := service.consumeSession(context.Background(), ceremony.ID, "registration", &owner); !errors.Is(err, ErrInvalidCeremony) {
		t.Fatalf("first failed completion did not consume the ceremony: %v", err)
	}
}

func TestExpiredAndWrongTypeCeremoniesAreRejected(t *testing.T) {
	id := uuid.New()
	repo := &ceremonyRepo{ceremonies: map[uuid.UUID]model.PasskeyCeremony{
		id: {ID: id, Kind: "authentication", SessionData: []byte(`{}`), ExpiresAt: time.Now().Add(-time.Second)},
	}}
	service := &Service{enabled: true, repo: repo}
	if _, _, err := service.consumeSession(context.Background(), id, "authentication", nil); !errors.Is(err, ErrInvalidCeremony) {
		t.Fatalf("expired ceremony accepted: %v", err)
	}

	fresh, err := newCeremony("authentication", nil, &webauthn.SessionData{})
	if err != nil {
		t.Fatal(err)
	}
	repo.ceremonies[fresh.ID] = fresh
	if _, _, err := service.consumeSession(context.Background(), fresh.ID, "registration", nil); !errors.Is(err, ErrInvalidCeremony) {
		t.Fatalf("wrong ceremony type accepted: %v", err)
	}
}

func TestCeremonyIsBoundToRelyingParty(t *testing.T) {
	ceremony, err := newCeremony("authentication", nil, &webauthn.SessionData{
		Challenge:      "challenge",
		RelyingPartyID: "other.example.com",
	})
	if err != nil {
		t.Fatal(err)
	}
	repo := &ceremonyRepo{ceremonies: map[uuid.UUID]model.PasskeyCeremony{ceremony.ID: ceremony}}
	service := &Service{enabled: true, rpID: "app.bimeet.pro", repo: repo}
	if _, _, err := service.consumeSession(context.Background(), ceremony.ID, "authentication", nil); !errors.Is(err, ErrInvalidCeremony) {
		t.Fatalf("ceremony for another RP accepted: %v", err)
	}
}

func TestPasskeyLimitsAndNames(t *testing.T) {
	repo := &ceremonyRepo{count: maxPasskeys}
	service, err := New(true, "localhost", "Bimeet", []string{"http://localhost:5173"}, repo, nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := service.BeginRegistration(context.Background(), uuid.New()); !errors.Is(err, ErrLimit) {
		t.Fatalf("expected passkey limit, got %v", err)
	}
	if err := validateName(""); !errors.Is(err, ErrInvalidName) {
		t.Fatalf("empty name accepted: %v", err)
	}
	if err := validateName(string(make([]rune, 65))); !errors.Is(err, ErrInvalidName) {
		t.Fatalf("65-rune name accepted: %v", err)
	}
	if err := validateName("Телефон"); err != nil {
		t.Fatalf("valid unicode name rejected: %v", err)
	}
}

func TestWebAuthnConfigurationValidatesOrigins(t *testing.T) {
	for _, tt := range []struct {
		name    string
		rpID    string
		origins []string
		valid   bool
	}{
		{"localhost", "localhost", []string{"http://localhost:5173"}, true},
		{"production", "app.bimeet.pro", []string{"https://app.bimeet.pro"}, true},
		{"malformed", "localhost", []string{"not-an-origin"}, false},
		{"outside rp", "app.bimeet.pro", []string{"https://evil.example"}, false},
		{"insecure production", "app.bimeet.pro", []string{"http://app.bimeet.pro"}, false},
	} {
		t.Run(tt.name, func(t *testing.T) {
			_, err := New(true, tt.rpID, "Bimeet", tt.origins, &ceremonyRepo{}, nil, nil)
			if tt.valid && err != nil {
				t.Fatalf("valid WebAuthn configuration rejected: %v", err)
			}
			if !tt.valid && err == nil {
				t.Fatal("invalid WebAuthn configuration was accepted")
			}
		})
	}
}

func TestOptionsResponsesUseBrowserJSONShape(t *testing.T) {
	userID := uuid.New()
	repo := &ceremonyRepo{}
	service, err := New(
		true,
		"localhost",
		"Bimeet",
		[]string{"http://localhost:5173"},
		repo,
		staticUserRepo{user: model.User{ID: userID, Email: "test@example.com", Name: "Test"}},
		nil,
	)
	if err != nil {
		t.Fatal(err)
	}

	login, err := service.BeginLogin(context.Background(), "default")
	if err != nil {
		t.Fatal(err)
	}
	assertDirectOptionsShape(t, login.Options, "challenge")

	registration, err := service.BeginRegistration(context.Background(), userID)
	if err != nil {
		t.Fatal(err)
	}
	assertDirectOptionsShape(t, registration.Options, "challenge", "rp", "user")
}

func assertDirectOptionsShape(t *testing.T, options any, requiredKeys ...string) {
	t.Helper()
	encoded, err := json.Marshal(options)
	if err != nil {
		t.Fatal(err)
	}
	var object map[string]json.RawMessage
	if err := json.Unmarshal(encoded, &object); err != nil {
		t.Fatal(err)
	}
	if _, wrapped := object["publicKey"]; wrapped {
		t.Fatal("options unexpectedly contain a publicKey wrapper")
	}
	for _, key := range requiredKeys {
		if _, ok := object[key]; !ok {
			t.Fatalf("options are missing %q: %s", key, encoded)
		}
	}
}
