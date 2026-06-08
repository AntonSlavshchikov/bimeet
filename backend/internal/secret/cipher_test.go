package secret

import (
	"encoding/base64"
	"strings"
	"testing"
)

func key32() string {
	return base64.StdEncoding.EncodeToString(make([]byte, 32))
}

func TestRoundTrip(t *testing.T) {
	c, err := New(key32())
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	if !c.Enabled() {
		t.Fatal("expected enabled cipher")
	}
	plain := "привет, это секрет 🔒"
	enc := c.Encrypt(plain)
	if enc == plain || !strings.HasPrefix(enc, prefix) {
		t.Fatalf("ciphertext looks wrong: %q", enc)
	}
	if got := c.Decrypt(enc); got != plain {
		t.Fatalf("round-trip mismatch: got %q want %q", got, plain)
	}
}

func TestDisabledPassthrough(t *testing.T) {
	c, err := New("")
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	if c.Enabled() {
		t.Fatal("expected disabled cipher")
	}
	if c.Encrypt("hi") != "hi" || c.Decrypt("hi") != "hi" {
		t.Fatal("disabled cipher must pass values through unchanged")
	}
}

func TestLegacyPlaintextDecrypt(t *testing.T) {
	c, _ := New(key32())
	// A value without the prefix (written before encryption was enabled) is returned as-is.
	if got := c.Decrypt("plain legacy message"); got != "plain legacy message" {
		t.Fatalf("legacy plaintext changed: %q", got)
	}
}

func TestTamperedReturnsAsIs(t *testing.T) {
	c, _ := New(key32())
	enc := c.Encrypt("secret")
	tampered := enc[:len(enc)-1] + "X"
	if got := c.Decrypt(tampered); got != tampered {
		t.Fatalf("expected best-effort passthrough on tamper, got %q", got)
	}
}

func TestInvalidKeyLength(t *testing.T) {
	if _, err := New(base64.StdEncoding.EncodeToString(make([]byte, 16))); err == nil {
		t.Fatal("expected error for 16-byte key")
	}
}
