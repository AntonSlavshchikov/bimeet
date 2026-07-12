package mailer

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSendInviteRejectsCRLFInSubjectInput(t *testing.T) {
	m := New(Config{})

	err := m.SendInvite("guest@example.com", "Gala\r\nBcc: attacker@example.com", "Alice", "token")

	require.Error(t, err)
	require.Contains(t, err.Error(), "invalid email subject")
}

func TestSendInviteRejectsCRLFInRecipient(t *testing.T) {
	m := New(Config{})

	err := m.SendInvite("guest@example.com\r\nBcc: attacker@example.com", "Gala", "Alice", "token")

	require.Error(t, err)
	require.Contains(t, err.Error(), "invalid email address")
}

func TestSendInviteAcceptsPlainRecipientWithoutTransport(t *testing.T) {
	m := New(Config{})

	require.NoError(t, m.SendInvite("guest@example.com", "Gala", "Alice", "token"))
}
