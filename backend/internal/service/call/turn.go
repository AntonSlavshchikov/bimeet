package callsvc

import (
	"crypto/hmac"
	"crypto/sha1" //nolint:gosec // HMAC-SHA1 is what coturn's use-auth-secret (TURN REST API) expects.
	"encoding/base64"
	"fmt"
	"time"

	"github.com/google/uuid"

	"bimeet/internal/model"
)

// TURNConfig points at our coturn. Empty Host → no STUN/TURN at all
// (local dev: two tabs on one machine connect over host candidates).
type TURNConfig struct {
	Host   string        // e.g. turn.bimeet.pro or the server IP
	Secret string        // coturn static-auth-secret
	TTL    time.Duration // credential lifetime
}

// DefaultTURNTTL is how long issued TURN credentials stay valid.
const DefaultTURNTTL = time.Hour

// ICEServers returns the iceServers list for RTCPeerConnection, with
// short-lived TURN credentials bound to userID.
func (s *Service) ICEServers(userID uuid.UUID) model.ICEServersResponse {
	resp := model.ICEServersResponse{ICEServers: []model.ICEServer{}}
	if s.turn.Host == "" {
		return resp
	}

	addr := s.turn.Host + ":3478"
	resp.ICEServers = append(resp.ICEServers, model.ICEServer{URLs: []string{"stun:" + addr}})

	if s.turn.Secret != "" {
		ttl := s.turn.TTL
		if ttl <= 0 {
			ttl = DefaultTURNTTL
		}
		user, cred := TURNCredentials(s.turn.Secret, userID, s.now().Add(ttl))
		resp.ICEServers = append(resp.ICEServers, model.ICEServer{
			URLs:       []string{"turn:" + addr + "?transport=udp", "turn:" + addr + "?transport=tcp"},
			Username:   user,
			Credential: cred,
		})
	}
	return resp
}

// TURNCredentials implements coturn's use-auth-secret scheme:
//
//	username   = "<unix expiry>:<userID>"
//	credential = base64(HMAC-SHA1(secret, username))
//
// coturn recomputes the HMAC with the same shared secret and rejects the
// username once the expiry timestamp has passed. No per-user state anywhere.
func TURNCredentials(secret string, userID uuid.UUID, expiry time.Time) (username, credential string) {
	username = fmt.Sprintf("%d:%s", expiry.Unix(), userID)
	mac := hmac.New(sha1.New, []byte(secret))
	mac.Write([]byte(username))
	return username, base64.StdEncoding.EncodeToString(mac.Sum(nil))
}
