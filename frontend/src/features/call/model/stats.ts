import type { CallStats } from './types'

/**
 * Pulls the numbers needed for the latency report (ITU-T G.114) out of
 * RTCPeerConnection.getStats():
 *   - RTT of the selected candidate pair (currentRoundTripTime, seconds → ms)
 *   - local candidate type: host (LAN), srflx (direct via STUN), relay (via TURN)
 *   - jitter and packetsLost of the incoming audio stream
 */
export async function readStats(pc: RTCPeerConnection): Promise<CallStats> {
  const report = await pc.getStats()
  const out: CallStats = { rttMs: null, candidateType: null, jitterMs: null, packetsLost: null }

  let pairId: string | undefined
  report.forEach(s => {
    if (s.type === 'transport' && s.selectedCandidatePairId) pairId = s.selectedCandidatePairId
  })

  report.forEach(s => {
    // Firefox has no transport.selectedCandidatePairId; fall back to the
    // nominated succeeded pair.
    const isSelected = pairId ? s.id === pairId : s.type === 'candidate-pair' && s.nominated && s.state === 'succeeded'
    if (s.type === 'candidate-pair' && isSelected) {
      if (typeof s.currentRoundTripTime === 'number') out.rttMs = Math.round(s.currentRoundTripTime * 1000)
      const local = report.get(s.localCandidateId)
      if (local) out.candidateType = local.candidateType ?? null
    }
    if (s.type === 'inbound-rtp' && s.kind === 'audio') {
      if (typeof s.jitter === 'number') out.jitterMs = Math.round(s.jitter * 1000)
      if (typeof s.packetsLost === 'number') out.packetsLost = s.packetsLost
    }
  })
  return out
}
