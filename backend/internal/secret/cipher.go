// Package secret provides symmetric encryption for sensitive data at rest
// (currently chat message bodies). It uses AES-256-GCM with a key supplied via
// configuration; an empty key yields a disabled cipher that passes values through
// as plaintext so local development works without setup.
package secret

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"strings"
)

// prefix marks values produced by Encrypt so Decrypt can distinguish ciphertext
// from legacy/plaintext values.
const prefix = "enc:"

type Cipher struct {
	gcm cipher.AEAD // nil when disabled (no key configured)
}

// New builds a Cipher from a base64-encoded 32-byte (AES-256) key. An empty key
// returns a disabled cipher (Encrypt/Decrypt are pass-throughs).
func New(keyB64 string) (*Cipher, error) {
	keyB64 = strings.TrimSpace(keyB64)
	if keyB64 == "" {
		return &Cipher{}, nil
	}
	key, err := base64.StdEncoding.DecodeString(keyB64)
	if err != nil {
		return nil, fmt.Errorf("decode encryption key: %w", err)
	}
	if len(key) != 32 {
		return nil, errors.New("CHAT_ENCRYPTION_KEY must be 32 bytes (base64-encoded) for AES-256")
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("new cipher: %w", err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("new gcm: %w", err)
	}
	return &Cipher{gcm: gcm}, nil
}

// Enabled reports whether a key is configured.
func (c *Cipher) Enabled() bool { return c.gcm != nil }

// Encrypt returns prefix + base64(nonce|ciphertext). When disabled it returns the
// plaintext unchanged.
func (c *Cipher) Encrypt(plaintext string) string {
	if c.gcm == nil {
		return plaintext
	}
	nonce := make([]byte, c.gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		// rand failure is effectively impossible; fail open rather than drop the message.
		return plaintext
	}
	sealed := c.gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return prefix + base64.StdEncoding.EncodeToString(sealed)
}

// Decrypt reverses Encrypt. Values without the prefix (legacy plaintext) and any
// value that fails to decrypt are returned unchanged.
func (c *Cipher) Decrypt(stored string) string {
	if c.gcm == nil || !strings.HasPrefix(stored, prefix) {
		return stored
	}
	raw, err := base64.StdEncoding.DecodeString(stored[len(prefix):])
	if err != nil || len(raw) < c.gcm.NonceSize() {
		return stored
	}
	nonce, ct := raw[:c.gcm.NonceSize()], raw[c.gcm.NonceSize():]
	plain, err := c.gcm.Open(nil, nonce, ct, nil)
	if err != nil {
		return stored
	}
	return string(plain)
}

// DecryptBody returns "" for a soft-deleted message body, otherwise the
// decrypted body — the "blank if deleted, else decrypt" rule shared by every
// place that surfaces a stored message body (full message rows, chat-list
// previews).
func (c *Cipher) DecryptBody(stored string, deleted bool) string {
	if deleted {
		return ""
	}
	return c.Decrypt(stored)
}
