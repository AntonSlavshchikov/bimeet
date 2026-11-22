import { API_URL, apiFetch, getToken } from '@/shared/api/client'
import type { CallSignalOut, IceServersResponse } from '@/features/call/model/types'

export const callApi = {
  iceServers: () => apiFetch<IceServersResponse>('/api/calls/ice-servers'),

  signal: (sig: CallSignalOut) =>
    apiFetch<void>('/api/calls/signal', { method: 'POST', body: JSON.stringify(sig) }),

  /**
   * Fire-and-forget hangup for tab close: `keepalive` lets the request
   * outlive the page. (sendBeacon can't send the Authorization header.)
   */
  signalOnUnload: (sig: CallSignalOut) => {
    const token = getToken()
    void fetch(`${API_URL}/api/calls/signal`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(sig),
    }).catch(() => {})
  },
}
