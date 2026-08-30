package config

import (
	"encoding/base64"
	"testing"
)

func TestValidatePasskeys(t *testing.T) {
	valid := Config{
		PasskeyEnabled:             true,
		WebAuthnRPID:               "app.bimeet.pro",
		WebAuthnRPOrigins:          []string{"https://app.bimeet.pro"},
		PasskeyCredentialCipherKey: base64.StdEncoding.EncodeToString(make([]byte, 32)),
	}
	if err := valid.ValidatePasskeys(); err != nil {
		t.Fatalf("valid configuration rejected: %v", err)
	}

	tests := []struct {
		name   string
		mutate func(*Config)
	}{
		{"missing rp id", func(c *Config) { c.WebAuthnRPID = "" }},
		{"missing origins", func(c *Config) { c.WebAuthnRPOrigins = nil }},
		{"missing encryption key", func(c *Config) { c.PasskeyCredentialCipherKey = "" }},
		{"invalid encryption key", func(c *Config) { c.PasskeyCredentialCipherKey = "not-base64" }},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg := valid
			tt.mutate(&cfg)
			if err := cfg.ValidatePasskeys(); err == nil {
				t.Fatal("invalid configuration was accepted")
			}
		})
	}

	disabled := Config{}
	if err := disabled.ValidatePasskeys(); err != nil {
		t.Fatalf("disabled passkeys should not require configuration: %v", err)
	}
}
