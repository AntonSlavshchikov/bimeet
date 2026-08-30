package passkeyrepo

import (
	"encoding/base64"
	"encoding/json"
	"testing"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"

	"bimeet/internal/model"
	"bimeet/internal/secret"
)

func TestDecodeCredentialsRestoresAuthoritativeCounterState(t *testing.T) {
	cipher, err := secret.NewPasskeyCipher(base64.StdEncoding.EncodeToString(make([]byte, 32)))
	if err != nil {
		t.Fatal(err)
	}
	repo := New(nil, cipher)
	stored := webauthn.Credential{ID: []byte("credential"), Authenticator: webauthn.Authenticator{SignCount: 2}}
	encoded, err := json.Marshal(stored)
	if err != nil {
		t.Fatal(err)
	}
	encrypted, err := cipher.Encrypt(encoded)
	if err != nil {
		t.Fatal(err)
	}

	credentials, err := repo.DecodeCredentials([]model.PasskeyCredential{{
		Passkey:        model.Passkey{ID: uuid.New()},
		CredentialData: encrypted,
		SignCount:      7,
		CloneWarning:   true,
	}})
	if err != nil {
		t.Fatal(err)
	}
	if len(credentials) != 1 || credentials[0].Authenticator.SignCount != 7 || !credentials[0].Authenticator.CloneWarning {
		t.Fatalf("counter state was not restored: %+v", credentials)
	}
}

func TestDecodeCredentialsFailsClosedOnTamper(t *testing.T) {
	cipher, err := secret.NewPasskeyCipher(base64.StdEncoding.EncodeToString(make([]byte, 32)))
	if err != nil {
		t.Fatal(err)
	}
	repo := New(nil, cipher)
	if _, err := repo.DecodeCredentials([]model.PasskeyCredential{{
		Passkey:        model.Passkey{ID: uuid.New()},
		CredentialData: []byte("plaintext-or-tampered"),
	}}); err == nil {
		t.Fatal("tampered credential record was accepted")
	}
}
