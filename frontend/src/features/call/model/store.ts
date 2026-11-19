import { create } from 'zustand'
import type { CallPhase, CallStats, EndReason, Peer } from './types'

/**
 * UI-facing call state. The engine (engine.ts) is the only writer; React
 * components read it. One active call per browser tab.
 *
 *   idle → calling (we invited) ──accept──→ connecting → in-call → ended
 *   idle → ringing (invited us) ──accept──↗
 */
export interface CallState {
  phase: CallPhase
  callId: string | null
  eventId: string | null
  peer: Peer | null
  startedAt: number | null // ms, set when media connects (for the timer)
  endReason: EndReason | null
  micMuted: boolean
  cameraOn: boolean
  remoteVideo: boolean // remote camera is sending frames
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  stats: CallStats | null
}

export const initialCallState: CallState = {
  phase: 'idle',
  callId: null,
  eventId: null,
  peer: null,
  startedAt: null,
  endReason: null,
  micMuted: false,
  cameraOn: false,
  remoteVideo: false,
  localStream: null,
  remoteStream: null,
  stats: null,
}

export const useCallStore = create<CallState>(() => initialCallState)
