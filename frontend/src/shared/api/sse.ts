import { API_URL, getToken } from '@/shared/api/client'

export interface SSEHandlers {
  onEvent: (type: string, data: string) => void
}

/**
 * Subscribes to a text/event-stream endpoint via fetch()+ReadableStream —
 * not the native EventSource API, which can't send a custom Authorization
 * header. Auto-reconnects with backoff on drop; call the returned function
 * to stop.
 */
export function subscribeSSE(path: string, { onEvent }: SSEHandlers): () => void {
  const controller = new AbortController()
  let stopped = false
  let backoffMs = 1000
  const MAX_BACKOFF_MS = 15_000

  async function connect() {
    while (!stopped) {
      try {
        const token = getToken()
        const res = await fetch(`${API_URL}${path}`, {
          signal: controller.signal,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok || !res.body) {
          throw new Error(`SSE connect failed: HTTP ${res.status}`)
        }
        backoffMs = 1000 // reset once a connection succeeds

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (!stopped) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          let sepIndex: number
          while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
            const frame = buffer.slice(0, sepIndex)
            buffer = buffer.slice(sepIndex + 2)
            parseFrame(frame, onEvent)
          }
        }
      } catch (err) {
        if (stopped || (err instanceof DOMException && err.name === 'AbortError')) return
      }
      if (stopped) return
      await sleep(backoffMs)
      backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS)
    }
  }

  connect()

  return () => {
    stopped = true
    controller.abort()
  }
}

function parseFrame(frame: string, onEvent: (type: string, data: string) => void) {
  let type = 'message'
  const dataLines: string[] = []
  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) type = line.slice(6).trim()
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
    // ':'-prefixed keepalive comment lines carry no data — ignored.
  }
  if (dataLines.length > 0) onEvent(type, dataLines.join('\n'))
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
