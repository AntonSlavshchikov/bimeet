# ADR 0005: 1:1 calls — P2P WebRTC with our own coturn

- Status: accepted
- Date: 2026-11-19
- Related: [0001](0001-hosting-provider.md), [0003](0003-minio-on-server.md), [architecture.md §5](../architecture.md#5-a-11-call), [runbooks/calls-check.md](../runbooks/calls-check.md)

## Context

Participants of an event need to talk to each other by voice (video optional) without leaving Bimeet. The scope is deliberately minimal: two people, no group calls, no recording, no screen sharing, no push notification for an incoming call, no call history.

Constraints:
- the whole product runs on one VM with 1 CPU / 2 GB RAM ([0001](0001-hosting-provider.md));
- realtime already exists as Server-Sent Events: an in-process hub with a personal stream per user (`/api/chats/stream`). There is no WebSocket.

## Decision drivers

- Fit on the existing server without a noticeable CPU or memory cost.
- No new long-running service in the backend, no new protocol in the browser.
- Calls must work between real networks (home Wi-Fi ↔ mobile operator), which are usually behind NAT.
- Every part can be explained at the defense.

## Considered options

1. **P2P WebRTC + our own coturn (STUN/TURN).** Media goes browser ↔ browser; the server only forwards signaling and, when a direct path is impossible, relays packets without decoding them.
2. **SFU (e.g. LiveKit) on the same server.** Each participant sends media to the server, which forwards it to the others.
3. **A hosted service (third-party SDK).** Ready-made calls behind an API key.

## Decision

Option 1.

- **Signaling** reuses the existing realtime channel: the browser sends `call.*` messages with `POST /api/calls/signal`, the backend checks that both people are participants of the same event and publishes the message into the recipient's personal SSE stream. Message types: `call.invite`, `call.accept`, `call.reject`, `call.cancel`, `call.hangup`, `call.offer`, `call.answer`, `call.ice`, plus `call.unavailable` from the server when the recipient has no open stream. The backend keeps no call state; the state machine lives in the browser (`frontend/src/features/call`).
- **Addressing by email.** Other participants' user IDs are never sent to the frontend (`EventUser` has only name and email), so the recipient is addressed by email and the server resolves it. The sender's email and name are set by the server, not taken from the request.
- **NAT traversal**: coturn on the same VM (`docker-compose.prod.yml`, `deploy/turnserver.conf`). The browser gets short-lived TURN credentials from `GET /api/calls/ice-servers`, using coturn's `use-auth-secret` scheme: `username = "<unix_expiry>:<userID>"`, `credential = base64(HMAC-SHA1(TURN_SECRET, username))`, TTL 1 hour. coturn checks the HMAC with the same shared secret, so there is no user database in coturn and leaked credentials expire on their own. Public STUN servers (e.g. Google's) are not used: from Russia they are unreliable, and our own server already has to run TURN.
- **Abuse limits**: one `call.invite` per user per 5 seconds (in-memory, like the hub itself); a signal body is capped at 64 KB; coturn refuses to relay to private address ranges (`denied-peer-ip`), so TURN can't be used to reach Postgres or MinIO on the server's internal networks.

### Why not an SFU

An SFU pays off from three participants up, or when the server must see the media (recording, transcoding). For two people it would route every packet through our 1 CPU server instead of only the calls that can't connect directly, add a service with its own configuration and keys, and still need TURN for restrictive networks. None of that is needed for 1:1.

### Why not a hosted service

A foreign SDK means another account, another key, and user media and metadata leaving Russia, which goes against the data-location driver in [0001](0001-hosting-provider.md).

## Consequences

**Positive**
- No media load on the server for calls that connect directly (`host`/`srflx` candidates); only relayed calls use our bandwidth.
- No new backend service and no WebSocket: two HTTP endpoints and a few message types on the existing SSE stream.
- Media is always encrypted end to end by WebRTC (DTLS-SRTP), including when it passes through TURN: coturn forwards packets it can't decrypt.

**Negative**
- 1:1 only. Group calls would need an SFU and a separate decision.
- Relayed calls go through our server: the relay port range (49160–49200, about 20 concurrent relayed calls) and the VM's bandwidth are the limit.
- No TLS for TURN (port 5349). Networks that allow only TLS on 443 won't connect. Future work: a certificate for coturn and `turns:` URLs.
- coturn uses `network_mode: host`. It binds the host's ports directly instead of going through Docker's network, so these ports are opened explicitly in the cloud firewall (`infra/terraform/firewall.tf`) and in ufw (cloud-init).
- The `TURN_SECRET` and the public IP are passed to coturn as command-line flags, so they are visible to someone who already has a shell on the server (`ps`). Acceptable for this project; a config file rendered at startup would avoid it.
- Signaling depends on the single-instance in-memory hub, like the chat (see `internal/realtime`). Several backend instances would need a shared broker.
- An incoming call rings only in an open Bimeet tab (no push notifications for calls, by scope).
