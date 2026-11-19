export type CallSignalType =
  | 'call.invite'
  | 'call.accept'
  | 'call.reject'
  | 'call.cancel'
  | 'call.hangup'
  | 'call.offer'
  | 'call.answer'
  | 'call.ice'
  | 'call.unavailable'

/** What we POST. The other side is addressed by email (see backend model.CallSignalRequest). */
export interface CallSignalOut {
  type: CallSignalType
  call_id: string
  to: string
  event_id: string
  payload?: unknown
}

/** What arrives on the personal SSE stream. Sender fields are set by the server. */
export interface CallSignalIn {
  type: CallSignalType
  call_id: string
  from_email: string
  from_name: string
  event_id: string
  payload?: unknown
}

export interface IceServersResponse {
  ice_servers: RTCIceServer[]
}

export type CallPhase = 'idle' | 'calling' | 'ringing' | 'connecting' | 'in-call' | 'ended'

/** Why a call ended — mapped to i18n keys calls.end.<reason>. */
export type EndReason =
  | 'hangup'
  | 'declined'
  | 'busy'
  | 'offline'
  | 'noAnswer'
  | 'cancelled'
  | 'mic'
  | 'failed'
  | 'error'

export interface Peer {
  email: string
  name: string
}

export interface CallStats {
  rttMs: number | null
  candidateType: string | null // host / srflx / relay
  jitterMs: number | null
  packetsLost: number | null
}
