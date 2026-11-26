package middleware

import (
	"net"
	"net/http"
	"net/netip"
	"strings"
)

// ClientIP sets r.RemoteAddr to the real client address, trusting only what
// our own proxies wrote.
//
// In production a request goes client → Traefik → frontend nginx → backend.
// Traefik replaces any client-sent X-Forwarded-For with the client's address,
// nginx appends Traefik's, so the backend sees "X-Forwarded-For: <client>,
// <traefik>" from nginx's address. Both proxies are on the private Docker
// network.
//
// The rule: only when the request itself comes from a private address (one
// of our proxies) is X-Forwarded-For used, and it is read right to left,
// skipping private hops; the first public address is the client. Anything a
// client prepends ends up to the left of that and is never reached.
// True-Client-IP and X-Real-IP are ignored: chi's RealIP trusted them from
// anyone, which let a client pick its own rate-limit key and log address.
func ClientIP(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if ip, ok := clientIP(r); ok {
			r.RemoteAddr = ip
		}
		next.ServeHTTP(w, r)
	})
}

func clientIP(r *http.Request) (string, bool) {
	peer, ok := parseIP(r.RemoteAddr)
	if !ok || !trustedHop(peer) {
		return "", false // direct connection: RemoteAddr is already the client
	}
	hops := strings.Split(strings.Join(r.Header.Values("X-Forwarded-For"), ","), ",")
	for i := len(hops) - 1; i >= 0; i-- {
		ip, ok := parseIP(strings.TrimSpace(hops[i]))
		if !ok {
			return "", false // malformed chain: keep the proxy address
		}
		if !trustedHop(ip) {
			return ip.String(), true
		}
	}
	return "", false
}

// trustedHop reports whether an address can be one of our proxies.
func trustedHop(ip netip.Addr) bool {
	return ip.IsPrivate() || ip.IsLoopback()
}

func parseIP(s string) (netip.Addr, bool) {
	if host, _, err := net.SplitHostPort(s); err == nil {
		s = host
	}
	ip, err := netip.ParseAddr(s)
	if err != nil {
		return netip.Addr{}, false
	}
	return ip.Unmap(), true
}
