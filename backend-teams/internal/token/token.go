// Package token mints and hashes opaque invite tokens. Only the SHA-256 hash is
// persisted, so a leaked invitations row cannot be replayed as a live invite.
package token

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
)

// Generate returns a URL-safe random invite token.
func Generate() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// Hash returns the hex SHA-256 of a raw token.
func Hash(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}
