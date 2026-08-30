package secret

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"io"
)

const passkeyEnvelopeVersion byte = 1

// PasskeyCipher encrypts credential records with authenticated encryption and
// deliberately has no disabled or plaintext-compatible mode.
type PasskeyCipher struct {
	gcm cipher.AEAD
}

func NewPasskeyCipher(encodedKey string) (*PasskeyCipher, error) {
	key, err := base64.StdEncoding.DecodeString(encodedKey)
	if err != nil {
		return nil, fmt.Errorf("decode passkey encryption key: %w", err)
	}
	if len(key) != 32 {
		return nil, fmt.Errorf("passkey encryption key must decode to exactly 32 bytes")
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("create passkey cipher: %w", err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("create passkey GCM: %w", err)
	}
	return &PasskeyCipher{gcm: gcm}, nil
}

func (c *PasskeyCipher) Encrypt(plaintext []byte) ([]byte, error) {
	nonce := make([]byte, c.gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, fmt.Errorf("generate passkey nonce: %w", err)
	}
	envelope := make([]byte, 1, 1+len(nonce)+len(plaintext)+c.gcm.Overhead())
	envelope[0] = passkeyEnvelopeVersion
	envelope = append(envelope, nonce...)
	envelope = c.gcm.Seal(envelope, nonce, plaintext, nil)
	return envelope, nil
}

func (c *PasskeyCipher) Decrypt(envelope []byte) ([]byte, error) {
	minimum := 1 + c.gcm.NonceSize() + c.gcm.Overhead()
	if len(envelope) < minimum || envelope[0] != passkeyEnvelopeVersion {
		return nil, fmt.Errorf("invalid passkey credential envelope")
	}
	nonce := envelope[1 : 1+c.gcm.NonceSize()]
	plaintext, err := c.gcm.Open(nil, nonce, envelope[1+c.gcm.NonceSize():], nil)
	if err != nil {
		return nil, fmt.Errorf("decrypt passkey credential: %w", err)
	}
	return plaintext, nil
}
