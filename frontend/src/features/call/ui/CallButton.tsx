import { useTranslation } from 'react-i18next'
import { Phone } from 'lucide-react'
import { Button } from '@/shared/ui'
import { startCall } from '@/features/call/model/engine'
import { useCallStore } from '@/features/call/model/store'
import type { Peer } from '@/features/call/model/types'

/** "Call" button next to an event participant. */
export function CallButton({ peer, eventId }: { peer: Peer; eventId: string }) {
  const { t } = useTranslation()
  const busy = useCallStore(s => s.phase !== 'idle' && s.phase !== 'ended')

  return (
    <Button
      size="icon"
      variant="ghost"
      aria-label={t('calls.callPerson', { name: peer.name })}
      title={t('calls.callPerson', { name: peer.name })}
      disabled={busy}
      onClick={e => {
        e.stopPropagation()
        void startCall(peer, eventId)
      }}
    >
      <Phone size={14} />
    </Button>
  )
}
