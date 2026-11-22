import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Maximize2, Mic, MicOff, Minimize2, Phone, PhoneOff, Video, VideoOff } from 'lucide-react'
import { useAuth } from '@/features/auth/model/AuthContext'
import { subscribeSSE } from '@/shared/api/sse'
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'
import { useCallStore } from '@/features/call/model/store'
import {
  acceptCall,
  dismissEnded,
  handleSignal,
  hangup,
  hangupOnUnload,
  rejectCall,
  toggleCamera,
  toggleMic,
} from '@/features/call/model/engine'
import type { CallSignalIn } from '@/features/call/model/types'

/**
 * Mounted once for the whole app (app/providers). Listens for call.* events
 * on the personal SSE stream on every page, so an incoming call rings no
 * matter where the user is, and renders the incoming dialog / call panel.
 */
export function CallLayer() {
  const { token } = useAuth()

  useEffect(() => {
    if (!token) return
    return subscribeSSE('/api/chats/stream', {
      onEvent: (type, data) => {
        if (!type.startsWith('call.')) return
        try {
          void handleSignal(JSON.parse(data) as CallSignalIn)
        } catch {
          // malformed frame — ignore
        }
      },
    })
  }, [token])

  useEffect(() => {
    window.addEventListener('pagehide', hangupOnUnload)
    return () => window.removeEventListener('pagehide', hangupOnUnload)
  }, [])

  return (
    <>
      <IncomingCallDialog />
      <CallPanel />
    </>
  )
}

function IncomingCallDialog() {
  const { t } = useTranslation()
  const phase = useCallStore(s => s.phase)
  const peer = useCallStore(s => s.peer)

  return (
    <Dialog open={phase === 'ringing'} onOpenChange={open => !open && rejectCall()}>
      <DialogContent>
        <DialogTitle>{t('calls.incomingTitle')}</DialogTitle>
        <DialogDescription>{t('calls.incomingFrom', { name: peer?.name ?? '' })}</DialogDescription>
        <DialogFooter className="mt-4 flex gap-2">
          <Button variant="danger" onClick={rejectCall}>
            <PhoneOff size={14} />
            {t('calls.decline')}
          </Button>
          <Button variant="primary" onClick={() => void acceptCall()}>
            <Phone size={14} />
            {t('calls.accept')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CallPanel() {
  const { t } = useTranslation()
  const s = useCallStore()
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  // Desktop only: the small corner panel can grow to almost the whole window.
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = s.remoteStream
  }, [s.remoteStream])

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = s.cameraOn ? s.localStream : null
  }, [s.localStream, s.cameraOn])

  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setExpanded(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  if (s.phase === 'idle' || s.phase === 'ringing') return null

  const status =
    s.phase === 'calling'
      ? t('calls.calling')
      : s.phase === 'connecting'
        ? t('calls.connecting')
        : s.phase === 'ended'
          ? t(`calls.end.${s.endReason ?? 'hangup'}`)
          : null

  return (
    <div
      role="dialog"
      aria-label={t('calls.panelLabel')}
      className={cn(
        'fixed z-50 rounded-[14px] border border-line bg-surface p-4 shadow-xl',
        expanded
          ? 'inset-6 flex flex-col'
          : 'inset-x-4 bottom-4 min-[541px]:left-auto min-[541px]:w-[340px]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-bold text-ink">{s.peer?.name}</div>
          <div className={cn('mt-0.5 text-[11px]', s.phase === 'ended' ? 'text-danger' : 'text-ink-3')}>
            {s.phase === 'in-call' && s.startedAt ? <CallTimer startedAt={s.startedAt} /> : status}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="hidden min-[541px]:inline-flex"
            aria-label={expanded ? t('calls.collapse') : t('calls.expand')}
            title={expanded ? t('calls.collapse') : t('calls.expand')}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </Button>
          {s.phase === 'ended' && (
            <Button size="sm" variant="ghost" onClick={dismissEnded}>
              {t('calls.close')}
            </Button>
          )}
        </div>
      </div>

      {/* Remote media: <video> also plays the remote audio. */}
      <div
        className={cn(
          'relative mt-3 overflow-hidden rounded-[10px] bg-bg-2',
          expanded && 'min-h-0 flex-1',
          !(s.remoteVideo || s.cameraOn) && 'hidden',
        )}
        onDoubleClick={() => setExpanded((v) => !v)}
      >
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={cn(expanded ? 'h-full w-full object-contain' : 'aspect-video w-full', !s.remoteVideo && 'invisible')}
        />
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            'absolute bottom-2 right-2 rounded-md border border-line',
            expanded ? 'w-48' : 'w-24',
            !s.cameraOn && 'hidden',
          )}
        />
      </div>

      {s.stats && (
        <pre className="mt-3 rounded-md bg-bg-2 p-2 text-[10px] text-ink-2">
          {`rtt ${s.stats.rttMs ?? '–'} ms · ${s.stats.candidateType ?? '–'}\njitter ${s.stats.jitterMs ?? '–'} ms · lost ${s.stats.packetsLost ?? '–'}`}
        </pre>
      )}

      {s.phase !== 'ended' && (
        <div className="mt-3 flex justify-center gap-2">
          {(s.phase === 'connecting' || s.phase === 'in-call') && (
            <>
              <Button
                size="icon"
                variant="outline"
                aria-label={s.micMuted ? t('calls.unmute') : t('calls.mute')}
                onClick={toggleMic}
              >
                {s.micMuted ? <MicOff size={16} /> : <Mic size={16} />}
              </Button>
              <Button
                size="icon"
                variant="outline"
                aria-label={s.cameraOn ? t('calls.cameraOff') : t('calls.cameraOn')}
                onClick={() => void toggleCamera()}
              >
                {s.cameraOn ? <Video size={16} /> : <VideoOff size={16} />}
              </Button>
            </>
          )}
          <Button size="icon" variant="danger" aria-label={t('calls.hangup')} onClick={hangup}>
            <PhoneOff size={16} />
          </Button>
        </div>
      )}
    </div>
  )
}

function CallTimer({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(startedAt)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const sec = Math.max(0, Math.floor((now - startedAt) / 1000))
  return <>{`${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`}</>
}
