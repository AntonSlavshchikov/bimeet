package config

import "testing"

func TestLoadJWTRememberExpHours(t *testing.T) {
	t.Run("default", func(t *testing.T) {
		t.Setenv("JWT_REMEMBER_EXP_HOURS", "")
		if got := Load().JWTRememberExpHours; got != 720 {
			t.Fatalf("JWTRememberExpHours = %d, want 720", got)
		}
	})

	t.Run("configured", func(t *testing.T) {
		t.Setenv("JWT_REMEMBER_EXP_HOURS", "1440")
		if got := Load().JWTRememberExpHours; got != 1440 {
			t.Fatalf("JWTRememberExpHours = %d, want 1440", got)
		}
	})

	t.Run("rejects non-positive value", func(t *testing.T) {
		t.Setenv("JWT_REMEMBER_EXP_HOURS", "-1")
		if got := Load().JWTRememberExpHours; got != 720 {
			t.Fatalf("JWTRememberExpHours = %d, want safe default 720", got)
		}
	})
}
