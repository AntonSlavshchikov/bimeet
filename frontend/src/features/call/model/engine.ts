/**
 * 1:1 call engine: RTCPeerConnection + getUserMedia + signaling.
 *
 * Media goes browser ↔ browser (P2P), or through our coturn when a direct
 * path is impossible. The backend only forwards signaling messages:
 * outgoing via POST /api/calls/signal, incoming via the personal SSE stream
 * (CallLayer feeds them into handleSignal).
 *
 * Kept outside React on purpose: a call must survive route changes and
 * re-renders, so the peer connection lives in this module and the UI reads
 * state from useCallStore.
 */
import { callApi } from '@/features/call/api'
import { initialCallState, useCallStore } from './store'
import { readStats } from './stats'
import type { CallSignalIn, CallSignalOut, CallSignalType, EndReason, Peer } from './types'

const RING_TIMEOUT_MS = 30_000
const ENDED_VISIBLE_MS = 3_000
const ICE_BATCH_MS = 100
const STATS_INTERVAL_MS = 5_000

let pc: RTCPeerConnection | null = null
let ringTimer: ReturnType<typeof setTimeout> | null = null
let statsTimer: ReturnType<typeof setInterval> | null = null
let endedTimer: ReturnType<typeof setTimeout> | null = null
// Remote candidates that arrived before the remote description was set.
let pendingRemoteIce: RTCIceCandidateInit[] = []
// Local candidates are batched: the backend hub drops messages for a slow
// subscriber, so one POST per ~100 ms is safer than a burst of 10.
let localIceBatch: RTCIceCandidateInit[] = []
let iceFlushTimer: ReturnType<typeof setTimeout> | null = null

const get = useCallStore.getState
const set = useCallStore.setState

function send(type: CallSignalType, payload?: unknown) {
  const { callId, peer, eventId } = get()
  if (!callId || !peer || !eventId) return
  const sig: CallSignalOut = { type, call_id: callId, to: peer.email, event_id: eventId, payload }
  callApi.signal(sig).catch(err => console.warn('[call] signal failed', type, err))
}

function replyTo(sig: CallSignalIn, type: CallSignalType, payload?: unknown) {
  callApi
    .signal({ type, call_id: sig.call_id, to: sig.from_email, event_id: sig.event_id, payload })
    .catch(() => {})
}

function clearTimers() {
  if (ringTimer) clearTimeout(ringTimer)
  if (statsTimer) clearInterval(statsTimer)
  if (iceFlushTimer) clearTimeout(iceFlushTimer)
  ringTimer = statsTimer = iceFlushTimer = null
}

/** Release everything and show the "ended" banner for a moment. */
function finish(reason: EndReason) {
  clearTimers()
  stopRing()
  pc?.close()
  pc = null
  pendingRemoteIce = []
  localIceBatch = []
  get().localStream?.getTracks().forEach(t => t.stop())

  set({ ...initialCallState, phase: 'ended', endReason: reason, peer: get().peer })
  if (endedTimer) clearTimeout(endedTimer)
  endedTimer = setTimeout(() => {
    if (get().phase === 'ended') set(initialCallState)
  }, ENDED_VISIBLE_MS)
}

function isActive() {
  const p = get().phase
  return p === 'calling' || p === 'ringing' || p === 'connecting' || p === 'in-call'
}

async function getMic(): Promise<MediaStream | null> {
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
  } catch {
    return null
  }
}

async function createPeerConnection(): Promise<RTCPeerConnection> {
  let iceServers: RTCIceServer[] = []
  try {
    iceServers = (await callApi.iceServers()).ice_servers
  } catch {
    // Without STUN/TURN only host candidates work — fine on one machine/LAN.
  }
  const conn = new RTCPeerConnection({ iceServers })
  const remote = new MediaStream()
  set({ remoteStream: remote })

  conn.ontrack = e => {
    remote.addTrack(e.track)
    if (e.track.kind === 'video') {
      // The video transceiver exists from the start (see below), so "camera
      // off" is a muted track, not a missing one.
      e.track.onmute = () => set({ remoteVideo: false })
      e.track.onunmute = () => set({ remoteVideo: true })
    }
  }

  conn.onicecandidate = e => {
    if (!e.candidate) return
    localIceBatch.push(e.candidate.toJSON())
    if (!iceFlushTimer) {
      iceFlushTimer = setTimeout(() => {
        iceFlushTimer = null
        const candidates = localIceBatch
        localIceBatch = []
        if (candidates.length) send('call.ice', { candidates })
      }, ICE_BATCH_MS)
    }
  }

  conn.oniceconnectionstatechange = () => {
    const state = conn.iceConnectionState
    if ((state === 'connected' || state === 'completed') && get().phase === 'connecting') {
      set({ phase: 'in-call', startedAt: Date.now() })
      startStats(conn)
    }
    if (state === 'failed') {
      // No ICE restart (out of scope): end the call with a clear message.
      send('call.hangup')
      finish('failed')
    }
  }

  return conn
}

function startStats(conn: RTCPeerConnection) {
  const debug = new URLSearchParams(window.location.search).get('debug') === '1'
  statsTimer = setInterval(async () => {
    const stats = await readStats(conn)
    // Logged unconditionally: used for latency measurements (ITU-T G.114).
    console.info('[call-stats]', JSON.stringify(stats))
    if (debug) set({ stats })
  }, STATS_INTERVAL_MS)
}

async function flushRemoteIce() {
  if (!pc?.remoteDescription) return
  for (const c of pendingRemoteIce) await pc.addIceCandidate(c).catch(() => {})
  pendingRemoteIce = []
}

// ─── Public actions (called from UI) ─────────────────────────────────────

export async function startCall(peer: Peer, eventId: string) {
  if (isActive()) return
  if (endedTimer) clearTimeout(endedTimer)

  const local = await getMic()
  if (!local) {
    set({ ...initialCallState, peer })
    finish('mic')
    return
  }

  set({
    ...initialCallState,
    phase: 'calling',
    callId: crypto.randomUUID(),
    eventId,
    peer,
    localStream: local,
  })
  send('call.invite')
  startRing()
  ringTimer = setTimeout(() => {
    if (get().phase === 'calling') {
      send('call.cancel')
      finish('noAnswer')
    }
  }, RING_TIMEOUT_MS)
}

export async function acceptCall() {
  if (get().phase !== 'ringing') return
  stopRing()
  if (ringTimer) clearTimeout(ringTimer)

  const local = await getMic()
  if (!local) {
    send('call.reject', { reason: 'mic' })
    finish('mic')
    return
  }
  set({ phase: 'connecting', localStream: local })
  pc = await createPeerConnection()
  send('call.accept') // caller now creates the offer
}

export function rejectCall() {
  if (get().phase !== 'ringing') return
  send('call.reject', { reason: 'declined' })
  stopRing()
  clearTimers()
  set(initialCallState)
}

export function hangup() {
  const phase = get().phase
  if (phase === 'calling') {
    send('call.cancel')
    finish('cancelled')
  } else if (phase === 'connecting' || phase === 'in-call') {
    send('call.hangup')
    finish('hangup')
  }
}

export function toggleMic() {
  const muted = !get().micMuted
  get().localStream?.getAudioTracks().forEach(t => (t.enabled = !muted))
  set({ micMuted: muted })
}

/**
 * Camera on/off without renegotiation: a video transceiver is negotiated
 * up front with no track, and we just swap the track in and out of it.
 */
export async function toggleCamera() {
  if (!pc) return
  const sender = pc.getTransceivers().find(t => t.receiver.track.kind === 'video')?.sender
  if (!sender) return
  const local = get().localStream
  if (!local) return

  if (get().cameraOn) {
    local.getVideoTracks().forEach(t => {
      t.stop()
      local.removeTrack(t)
    })
    await sender.replaceTrack(null)
    set({ cameraOn: false, localStream: new MediaStream(local.getTracks()) })
    return
  }

  try {
    const cam = await navigator.mediaDevices.getUserMedia({ video: true })
    const track = cam.getVideoTracks()[0]
    await sender.replaceTrack(track)
    local.addTrack(track)
    set({ cameraOn: true, localStream: new MediaStream(local.getTracks()) })
  } catch {
    console.warn('[call] camera unavailable')
  }
}

/** Tab closing mid-call: tell the other side, the request outlives the page. */
export function hangupOnUnload() {
  const { phase, callId, peer, eventId } = get()
  if (!callId || !peer || !eventId) return
  const type = phase === 'calling' ? 'call.cancel' : phase === 'ringing' ? 'call.reject' : 'call.hangup'
  if (phase === 'idle' || phase === 'ended') return
  callApi.signalOnUnload({ type, call_id: callId, to: peer.email, event_id: eventId })
}

export function dismissEnded() {
  if (get().phase === 'ended') set(initialCallState)
}

// ─── Incoming signals (from the SSE stream) ───────────────────────────────

export async function handleSignal(sig: CallSignalIn) {
  const s = get()

  if (sig.type === 'call.invite') {
    if (isActive()) {
      replyTo(sig, 'call.reject', { reason: 'busy' })
      return
    }
    if (endedTimer) clearTimeout(endedTimer)
    set({
      ...initialCallState,
      phase: 'ringing',
      callId: sig.call_id,
      eventId: sig.event_id,
      peer: { email: sig.from_email, name: sig.from_name },
    })
    startRing()
    ringTimer = setTimeout(() => {
      if (get().phase === 'ringing') {
        stopRing()
        set(initialCallState)
      }
    }, RING_TIMEOUT_MS)
    return
  }

  if (sig.call_id !== s.callId) return // not our call (or a stale one)

  switch (sig.type) {
    case 'call.accept':
      if (s.phase === 'ringing') {
        // Echo: we answered in another tab — stop ringing here.
        stopRing()
        clearTimers()
        set(initialCallState)
        return
      }
      if (s.phase !== 'calling' || !s.localStream) return
      stopRing()
      if (ringTimer) clearTimeout(ringTimer)
      set({ phase: 'connecting' })
      pc = await createPeerConnection()
      s.localStream.getAudioTracks().forEach(t => pc!.addTrack(t, s.localStream!))
      pc.addTransceiver('video', { direction: 'sendrecv' })
      await pc.setLocalDescription(await pc.createOffer())
      send('call.offer', { sdp: pc.localDescription })
      return

    case 'call.offer': {
      if (!pc || !s.localStream) return
      const { sdp } = sig.payload as { sdp: RTCSessionDescriptionInit }
      await pc.setRemoteDescription(sdp)
      // Attach our mic to the audio transceiver the offer created, and make
      // both transceivers sendrecv so the camera can be swapped in later.
      for (const tr of pc.getTransceivers()) {
        tr.direction = 'sendrecv'
        if (tr.receiver.track.kind === 'audio') {
          await tr.sender.replaceTrack(s.localStream.getAudioTracks()[0] ?? null)
        }
      }
      await pc.setLocalDescription(await pc.createAnswer())
      send('call.answer', { sdp: pc.localDescription })
      await flushRemoteIce()
      return
    }

    case 'call.answer': {
      if (!pc) return
      const { sdp } = sig.payload as { sdp: RTCSessionDescriptionInit }
      await pc.setRemoteDescription(sdp)
      await flushRemoteIce()
      return
    }

    case 'call.ice': {
      const { candidates } = sig.payload as { candidates: RTCIceCandidateInit[] }
      pendingRemoteIce.push(...candidates)
      await flushRemoteIce()
      return
    }

    case 'call.reject': {
      if (s.phase === 'ringing') {
        // Echo: declined in another tab.
        stopRing()
        clearTimers()
        set(initialCallState)
        return
      }
      const reason = (sig.payload as { reason?: string } | undefined)?.reason
      finish(reason === 'busy' ? 'busy' : 'declined')
      return
    }

    case 'call.cancel':
      if (s.phase === 'ringing') {
        stopRing()
        clearTimers()
        set(initialCallState)
      }
      return

    case 'call.hangup':
      finish('hangup')
      return

    case 'call.unavailable':
      finish('offline')
      return
  }
}

// ─── Ring tone (WebAudio beeps, no audio asset) ───────────────────────────

let ringCtx: AudioContext | null = null
let ringLoop: ReturnType<typeof setInterval> | null = null

function beep() {
  if (!ringCtx) return
  const osc = ringCtx.createOscillator()
  const gain = ringCtx.createGain()
  osc.frequency.value = 440
  gain.gain.value = 0.08
  osc.connect(gain).connect(ringCtx.destination)
  osc.start()
  osc.stop(ringCtx.currentTime + 0.4)
}

function startRing() {
  try {
    ringCtx = new AudioContext()
    beep()
    ringLoop = setInterval(beep, 2000)
  } catch {
    // Autoplay policy may block audio before any user gesture: the dialog
    // is still shown, just silent.
  }
}

function stopRing() {
  if (ringLoop) clearInterval(ringLoop)
  ringLoop = null
  ringCtx?.close().catch(() => {})
  ringCtx = null
}
