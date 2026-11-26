// k6 load test for the Bimeet API. See loadtest/README.md before running:
// it targets production and has measurement caveats.
//
//   BIMEET_EMAIL=... BIMEET_CODE=... k6 run loadtest/bimeet.js
//
// Two scenarios run one after the other:
//   browse — typical user: events list → open event → messages, ramped
//            10 → 25 → 50 → 100 VUs, 2.5 min per step;
//   sse    — open /api/chats/stream connections and hold them, ramped to
//            100 concurrent (k6 holds one blocking request per VU, so the VU
//            cap is also the connection cap).
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Counter } from 'k6/metrics'

const BASE = __ENV.BASE_URL || 'https://app.bimeet.pro'
const EMAIL = __ENV.BIMEET_EMAIL
const CODE = __ENV.BIMEET_CODE
const STEP = __ENV.STEP || '2m30s'

const sseOpened = new Counter('sse_opened')

export const options = {
  scenarios: {
    browse: {
      executor: 'ramping-vus',
      exec: 'browse',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 10 }, { duration: STEP, target: 10 },
        { duration: '15s', target: 25 }, { duration: STEP, target: 25 },
        { duration: '15s', target: 50 }, { duration: STEP, target: 50 },
        { duration: '15s', target: 100 }, { duration: STEP, target: 100 },
      ],
      gracefulRampDown: '10s',
      tags: { scenario: 'browse' },
    },
    sse: {
      executor: 'ramping-vus',
      exec: 'sse',
      startTime: '11m10s', // after browse finishes
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '1m', target: 100 },
      ],
      gracefulRampDown: '5s',
      tags: { scenario: 'sse' },
    },
  },
  thresholds: {
    'http_req_duration{scenario:browse}': ['p(95)<500'],
    'http_req_failed{scenario:browse}': ['rate<0.01'],
  },
  // Per-step numbers are cut out of the time series afterwards (--out json).
  summaryTrendStats: ['avg', 'med', 'p(95)', 'p(99)', 'max'],
}

// The API rate limit is 300 req/min per client IP, and every VU runs from
// one machine. Each VU sends its own fake True-Client-IP, which the backend
// currently trusts (a known vulnerability, fixed separately) — so the test
// measures the server, not the limiter. Documented in README.md.
function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    'True-Client-IP': `10.77.${Math.floor(__VU / 250)}.${__VU % 250}`,
  }
}

export function setup() {
  if (!EMAIL || !CODE) throw new Error('set BIMEET_EMAIL and BIMEET_CODE')
  const json = { headers: { 'Content-Type': 'application/json' } }
  http.post(`${BASE}/api/auth/request-code`, JSON.stringify({ email: EMAIL }), json)
  const res = http.post(`${BASE}/api/auth/verify-code`, JSON.stringify({ email: EMAIL, code: CODE }), json)
  if (res.status !== 200) throw new Error(`login failed: HTTP ${res.status}`)
  const token = res.json('token') // never logged

  const list = http.get(`${BASE}/api/events`, { headers: { Authorization: `Bearer ${token}` } })
  const events = list.json() || []
  if (!events.length) throw new Error('the test user needs at least one event')
  return { token, eventId: events[0].id }
}

export function browse({ token, eventId }) {
  const h = { headers: headers(token) }
  const r1 = http.get(`${BASE}/api/events`, { ...h, tags: { name: 'events_list' } })
  check(r1, { 'list 200': (r) => r.status === 200 })
  sleep(Math.random() * 2 + 1)

  const r2 = http.get(`${BASE}/api/events/${eventId}`, { ...h, tags: { name: 'event_detail' } })
  check(r2, { 'detail 200': (r) => r.status === 200 })
  const r3 = http.get(`${BASE}/api/events/${eventId}/messages`, { ...h, tags: { name: 'messages' } })
  check(r3, { 'messages 200': (r) => r.status === 200 })
  sleep(Math.random() * 2 + 1)
}

export function sse({ token }) {
  // k6 has no streaming client: the request stays open until the timeout,
  // which is exactly "hold a connection". A 200 that ends by timeout counts
  // as a held stream; open connections are also counted on the server.
  sseOpened.add(1)
  http.get(`${BASE}/api/chats/stream`, {
    headers: { ...headers(token), Accept: 'text/event-stream' },
    timeout: '50s',
    tags: { name: 'sse' },
    responseCallback: http.expectedStatuses(0, 200),
  })
}
