# Runbook: checking 1:1 calls after a deploy

How calls work: [ADR 0005](../adr/0005-calls-p2p-webrtc.md), sequence diagram in [architecture.md §5](../architecture.md#5-a-11-call).

## 0. Server side

```bash
cd ~/bimeet
docker compose --env-file .env.prod -f docker-compose.prod.yml ps coturn      # Up
docker compose --env-file .env.prod -f docker-compose.prod.yml logs coturn | grep -i "relay ports initialization done"
sudo ss -lnup | grep 3478                                                       # coturn listens on UDP 3478
sudo ufw status | grep -E "3478|49160"                                          # ports open in ufw
```

From your laptop, check that STUN answers (any STUN client; for example with `stunclient` from the `stuntman` package):

```bash
stunclient <server_ip> 3478    # "Binding test: success", mapped address = your public IP
```

Check that the backend hands out TURN credentials (token from DevTools → Application → Local Storage → `token`):

```bash
curl -s -H "Authorization: Bearer $TOKEN" https://app.bimeet.pro/api/calls/ice-servers
# {"ice_servers":[{"urls":["stun:<ip>:3478"]},{"urls":["turn:<ip>:3478?transport=udp","turn:<ip>:3478?transport=tcp"],"username":"<expiry>:<user id>","credential":"..."}]}
```

## 1. Two people, two networks

You need two accounts that are participants of the same event, and two devices on **different** networks: e.g. a laptop on Wi-Fi and a phone on mobile data (Wi-Fi off). Same-network tests only prove the `host` path.

1. Open `https://app.bimeet.pro/events/<id>?debug=1` on both devices and log in. Keep the tab open on the callee side: an incoming call rings only in an open Bimeet tab.
2. Caller: "Participants" tab → phone icon next to the other person. Allow the microphone.
3. Callee: the "Incoming call" dialog appears → "Accept".
4. Both: the call panel shows the timer; you hear each other. Try mute and the camera button.
5. Hang up on one side: the other shows "Call ended".

Error cases worth trying once: callee's tab closed → "The other person is offline"; callee declines → "Call declined"; no answer for 30 s → "No answer"; microphone blocked in the browser → "No microphone access".

## 2. Is TURN actually used?

With `?debug=1` the call panel shows a line every 5 s:

```
rtt 42 ms · relay
jitter 3 ms · lost 0
```

The second word is the type of the local candidate in use:
- `host` — same network, direct;
- `srflx` — different networks, direct through NAT (STUN worked);
- `relay` — media goes through our coturn (TURN worked).

To force `relay` for a test: Firefox → `about:config` → `media.peerconnection.ice.relay_only = true` (set it back afterwards). Or in Chrome, `chrome://webrtc-internals` shows the selected candidate pair as well.

If the call stays on "Connecting…" and then ends with "Connection lost", ICE found no path: check the firewall ports (3478 udp/tcp, 49160–49200 udp), `TURN_EXTERNAL_IP`, and that `TURN_SECRET` is the same for the backend and coturn (coturn logs `401` on a wrong secret).

## 3. Measuring latency for the report (ITU-T G.114)

The same numbers go to the browser console every 5 s during a call, with or without `?debug=1`:

```
[call-stats] {"rttMs":42,"candidateType":"relay","jitterMs":3,"packetsLost":0}
```

1. Open DevTools → Console on one side, filter by `call-stats`.
2. Hold the call for 2–3 minutes per scenario (`host`, `srflx`, `relay`).
3. Right-click the console → "Save as…", or copy the lines into a spreadsheet.
4. One-way delay ≈ RTT / 2 (network part only; add ~20–40 ms for capture, codec and jitter buffer). G.114 recommends keeping one-way delay below 150 ms for good conversational quality; 150–400 ms is acceptable with some degradation.

`rttMs` is `currentRoundTripTime` of the selected ICE candidate pair; `jitterMs` and `packetsLost` come from the incoming audio stream (`inbound-rtp`).
