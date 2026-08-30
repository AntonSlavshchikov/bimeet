package secret

import (
	"bytes"
	"encoding/base64"
	"testing"
)

func TestPasskeyCipherRoundTripAndTamperDetection(t *testing.T) {
	key := bytes.Repeat([]byte{0x42}, 32)
	cipher, err := NewPasskeyCipher(base64.StdEncoding.EncodeToString(key))
	if err != nil {
		t.Fatalf("NewPasskeyCipher: %v", err)
	}

	plaintext := []byte(`{"credential":"secret"}`)
	encrypted, err := cipher.Encrypt(plaintext)
	if err != nil {
		t.Fatalf("Encrypt: %v", err)
	}
	if bytes.Contains(encrypted, plaintext) {
		t.Fatal("encrypted envelope contains plaintext")
	}
	decrypted, err := cipher.Decrypt(encrypted)
	if err != nil {
		t.Fatalf("Decrypt: %v", err)
	}
	if !bytes.Equal(decrypted, plaintext) {
		t.Fatalf("round trip mismatch: got %q", decrypted)
	}

	tampered := append([]byte(nil), encrypted...)
	tampered[len(tampered)-1] ^= 0x01
	if _, err := cipher.Decrypt(tampered); err == nil {
		t.Fatal("tampered ciphertext was accepted")
	}
}

func TestPasskeyCipherRejectsInvalidKeysAndPlaintext(t *testing.T) {
	for _, value := range []string{"", "not-base64", base64.StdEncoding.EncodeToString(make([]byte, 16))} {
		if _, err := NewPasskeyCipher(value); err == nil {
			t.Fatalf("invalid key %q was accepted", value)
		}
	}

	cipher, err := NewPasskeyCipher(base64.StdEncoding.EncodeToString(make([]byte, 32)))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := cipher.Decrypt([]byte(`{"id":"plaintext"}`)); err == nil {
		t.Fatal("plaintext credential record was accepted")
	}
}
