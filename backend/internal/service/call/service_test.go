package callsvc

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"bimeet/internal/model"
	"bimeet/internal/service/call/mock"
)

var (
	alice = uuid.MustParse("11111111-1111-1111-1111-111111111111")
	bob   = uuid.MustParse("22222222-2222-2222-2222-222222222222")
	event = uuid.MustParse("33333333-3333-3333-3333-333333333333")
	t0    = time.Unix(1700000000, 0)
)

type deps struct {
	events *mock.MockEventChecker
	users  *mock.MockUserLookup
	hub    *mock.MockHub
}

func newSvc(t *testing.T, turn TURNConfig) (*Service, deps) {
	ctrl := gomock.NewController(t)
	d := deps{mock.NewMockEventChecker(ctrl), mock.NewMockUserLookup(ctrl), mock.NewMockHub(ctrl)}
	s := New(d.events, d.users, d.hub, turn)
	s.now = func() time.Time { return t0 }
	return s, d
}

const bobEmail = "bob@example.com"

var (
	aliceUser = model.User{ID: alice, Name: "Alice", Email: "alice@example.com"}
	bobUser   = model.User{ID: bob, Name: "Bob", Email: bobEmail}
)

func req(typ string) model.CallSignalRequest {
	return model.CallSignalRequest{Type: typ, CallID: uuid.New(), To: bobEmail, EventID: event}
}

// knownUsers makes alice the sender and bob@example.com resolve to bob.
func knownUsers(d deps) {
	d.users.EXPECT().GetByID(gomock.Any(), alice).Return(aliceUser, nil).AnyTimes()
	d.users.EXPECT().GetByEmail(gomock.Any(), bobEmail).Return(bobUser, nil).AnyTimes()
}

func bothParticipants(d deps) {
	knownUsers(d)
	d.events.EXPECT().IsParticipant(gomock.Any(), event, alice).Return(true, nil).AnyTimes()
	d.events.EXPECT().IsParticipant(gomock.Any(), event, bob).Return(true, nil).AnyTimes()
}

// Reference value computed independently:
// base64(hmac_sha1("test-secret", "1700003600:1111…")) in Python.
func TestTURNCredentialsKnownVector(t *testing.T) {
	user, cred := TURNCredentials("test-secret", alice, t0.Add(time.Hour))
	assert.Equal(t, "1700003600:11111111-1111-1111-1111-111111111111", user)
	assert.Equal(t, "jFvW7oHWogCxTGW4WvAmHMD2q3w=", cred)
}

func TestICEServers(t *testing.T) {
	s, _ := newSvc(t, TURNConfig{Host: "turn.example", Secret: "test-secret"})
	got := s.ICEServers(alice).ICEServers

	require.Len(t, got, 2)
	assert.Equal(t, []string{"stun:turn.example:3478"}, got[0].URLs)
	assert.Equal(t, []string{"turn:turn.example:3478?transport=udp", "turn:turn.example:3478?transport=tcp"}, got[1].URLs)
	assert.Equal(t, "1700003600:"+alice.String(), got[1].Username) // default TTL 1h
	assert.Equal(t, "jFvW7oHWogCxTGW4WvAmHMD2q3w=", got[1].Credential)
}

func TestICEServersWithoutTURNHostIsEmpty(t *testing.T) {
	s, _ := newSvc(t, TURNConfig{})
	assert.Empty(t, s.ICEServers(alice).ICEServers)
}

func TestSignalRejectsNonParticipant(t *testing.T) {
	s, d := newSvc(t, TURNConfig{})
	knownUsers(d)
	d.events.EXPECT().IsParticipant(gomock.Any(), event, alice).Return(true, nil)
	d.events.EXPECT().IsParticipant(gomock.Any(), event, bob).Return(false, nil)
	// hub has no expectations: nothing may be published.

	err := s.Signal(context.Background(), alice, req(TypeOffer))
	assert.ErrorIs(t, err, ErrForbidden)
}

func TestSignalUnknownEmailIsForbidden(t *testing.T) {
	s, d := newSvc(t, TURNConfig{})
	d.users.EXPECT().GetByID(gomock.Any(), alice).Return(aliceUser, nil)
	d.users.EXPECT().GetByEmail(gomock.Any(), "nobody@example.com").Return(model.User{}, errors.New("not found"))

	r := req(TypeInvite)
	r.To = "nobody@example.com"
	assert.ErrorIs(t, s.Signal(context.Background(), alice, r), ErrForbidden)
}

func TestSignalRejectsInvalid(t *testing.T) {
	s, d := newSvc(t, TURNConfig{})
	d.users.EXPECT().GetByID(gomock.Any(), alice).Return(aliceUser, nil).AnyTimes()
	d.users.EXPECT().GetByEmail(gomock.Any(), aliceUser.Email).Return(aliceUser, nil).AnyTimes()

	bad := []model.CallSignalRequest{
		{Type: "call.bogus", CallID: uuid.New(), To: bobEmail, EventID: event},
		{Type: TypeOffer, To: bobEmail, EventID: event},                            // no call_id
		{Type: TypeOffer, CallID: uuid.New(), To: aliceUser.Email, EventID: event}, // self-call
	}
	for _, r := range bad {
		assert.ErrorIs(t, s.Signal(context.Background(), alice, r), ErrInvalid)
	}
}

func TestSignalRoutesOnlyToRecipient(t *testing.T) {
	s, d := newSvc(t, TURNConfig{})
	bothParticipants(d)

	r := req(TypeOffer)
	r.Payload = json.RawMessage(`{"sdp":"v=0"}`)
	d.hub.EXPECT().PublishCall(bob, gomock.Any()).DoAndReturn(func(_ uuid.UUID, sig model.CallSignal) {
		assert.Equal(t, aliceUser.Email, sig.FromEmail, "sender is set by the server")
		assert.Equal(t, r.CallID, sig.CallID)
		assert.JSONEq(t, `{"sdp":"v=0"}`, string(sig.Payload))
	})

	require.NoError(t, s.Signal(context.Background(), alice, r))
}

func TestSignalAcceptIsEchoedToSenderTabs(t *testing.T) {
	s, d := newSvc(t, TURNConfig{})
	bothParticipants(d)
	d.hub.EXPECT().PublishCall(bob, gomock.Any())
	d.hub.EXPECT().PublishCall(alice, gomock.Any())

	require.NoError(t, s.Signal(context.Background(), alice, req(TypeAccept)))
}

func TestInviteToOfflineUserReturnsUnavailable(t *testing.T) {
	s, d := newSvc(t, TURNConfig{})
	bothParticipants(d)
	d.hub.EXPECT().IsUserOnline(bob).Return(false)
	d.hub.EXPECT().PublishCall(alice, gomock.Any()).DoAndReturn(func(_ uuid.UUID, sig model.CallSignal) {
		assert.Equal(t, TypeUnavailable, sig.Type)
		assert.Equal(t, bobEmail, sig.FromEmail)
	})

	require.NoError(t, s.Signal(context.Background(), alice, req(TypeInvite)))
}

func TestInviteCarriesCallerNameAndIsRateLimited(t *testing.T) {
	s, d := newSvc(t, TURNConfig{})
	bothParticipants(d)
	d.hub.EXPECT().IsUserOnline(bob).Return(true).Times(2)
	d.hub.EXPECT().PublishCall(bob, gomock.Any()).Times(2).Do(func(_ uuid.UUID, sig model.CallSignal) {
		assert.Equal(t, "Alice", sig.FromName)
	})

	require.NoError(t, s.Signal(context.Background(), alice, req(TypeInvite)))
	require.ErrorIs(t, s.Signal(context.Background(), alice, req(TypeInvite)), ErrRateLimited)

	s.now = func() time.Time { return t0.Add(InviteInterval) }
	require.NoError(t, s.Signal(context.Background(), alice, req(TypeInvite)))
}
