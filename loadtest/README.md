# Load test (k6)

`bimeet.js` drives the production API; `server-stats.sh` samples per-container CPU/RAM on the server while it runs.

```bash
brew install k6
HOST=deploy@<server_ip> loadtest/server-stats.sh > loadtest/results/server-stats.csv &
BIMEET_EMAIL=<test account> BIMEET_CODE=<login code> \
  SUMMARY_JSON=loadtest/results/summary.json \
  k6 run --out json=loadtest/results/raw.json loadtest/bimeet.js
```

The test account needs at least one event. Credentials come from the environment. The token is never printed, and `handleSummary` drops `setup_data` (which holds it) from the summary; don't use `--summary-export`, which writes it out.

## Scenarios

- **browse** — a typical user: `GET /api/events` → pause 1–3 s → `GET /api/events/{id}` + `GET /api/events/{id}/messages` → pause 1–3 s. Steps of 10 → 25 → 50 → 100 VUs, 2.5 min each. Thresholds: p95 < 500 ms, errors < 1%.
- **sse** — hold `GET /api/chats/stream` connections open, ramping to 100 concurrent, each held 50 s.

Login runs once in `setup()`: the auth endpoints are limited to 10 req/min per IP, so loading them would only test the brute-force guard.

## Results — 2026-11-26, Timeweb 1 vCPU / 2 GB, release v1.0.30

Client: one laptop on a home connection in Russia. Duration 14 min 40 s.

| VUs | RPS | median | p95 | errors | backend CPU avg / max | Postgres CPU max | RAM, all containers |
|---|---|---|---|---|---|---|---|
| 10 | 6.8 | 115 ms | 215 ms | 0% | 1% / 3% | 7% | 233 MB |
| 25 | 16.3 | 109 ms | 810 ms* | 0% | 3% / 4% | 9% | 246 MB |
| 50 | 34.3 | 105 ms | 158 ms | 0% | 5% / 7% | 11% | 243 MB |
| 100 | 69.1 | 109 ms | 151 ms | 0% | 11% / 15% | 19% | 255 MB |

\* A short latency spike on the client's network during this step (median stayed at 109 ms, and the next, heavier step was back to 158 ms); backend CPU stayed at 3–4% during it.

Whole browse run: 20 424 requests, 0 errors, p95 = 198 ms — both thresholds pass. Backend memory stayed at ~27 MB throughout.

**SSE:** 100 concurrent streams held for their full 50 s (server log: every `/api/chats/stream` request `200`, 46–50 s), with backend CPU ≤ 1% and no memory growth (27 MB).

**Conclusion.** The server did not degrade within the allowed load. At 100 VUs (~70 RPS) the backend used ~11% of one vCPU and Postgres ~19%; latency at the median did not change from 10 to 100 VUs, so it is dominated by network round trip (~100 ms), not by the server. By linear extrapolation of CPU, saturation would start somewhere around 400–500 VUs (~300 RPS) of this mix; this was not tested.

## Limitations of this measurement

- **The rate limiter was bypassed.** The API allows 300 req/min per client IP and all VUs ran from one machine. Each VU sent its own fake `True-Client-IP`, which the backend trusted at the time — a vulnerability found while preparing this test and fixed separately. Without the bypass the test would have measured the limiter (≈5 RPS), not the server.
- **One user, one token.** All VUs share one account and one event, so Postgres serves the same rows from cache; with many distinct users and events the database would do more work.
- **Read-only.** No writes (messages, uploads) and no realtime fan-out between users.
- **One client.** Results include the client's network; the 100-VU cap keeps the test safe for production but leaves the server's real limit unknown.
