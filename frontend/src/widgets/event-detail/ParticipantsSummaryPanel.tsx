import { useTranslation } from 'react-i18next'
import type { Event } from '@/entities/event/model/types'
import { Avatar, AvatarStack } from '@/shared/ui/avatar'
import { StatusPill } from '@/shared/ui/status-pill'

interface ParticipantsSummaryPanelProps {
  event: Event
}

export default function ParticipantsSummaryPanel({ event }: ParticipantsSummaryPanelProps) {
  const { t } = useTranslation()
  const confirmed = event.participants.filter(p => p.status === 'confirmed')
  const invited = event.participants.filter(p => p.status === 'invited')
  const declined = event.participants.filter(p => p.status === 'declined')

  if (event.participants.length === 0) return null

  return (
    <div className="rounded-[14px] border border-line bg-surface p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3 mb-3">
        {t('participantsSummary.title', 'Участники')}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <StatusPill variant="going">
          {t('participantsSummary.going', { count: confirmed.length, defaultValue: `${confirmed.length} идут` })}
        </StatusPill>
        {invited.length > 0 && (
          <StatusPill variant="invited">
            {t('participantsSummary.waiting', { count: invited.length, defaultValue: `${invited.length} раздумывают` })}
          </StatusPill>
        )}
        {declined.length > 0 && (
          <StatusPill variant="completed">
            {t('participantsSummary.declined', { count: declined.length, defaultValue: `${declined.length} отказались` })}
          </StatusPill>
        )}
      </div>

      {confirmed.length > 0 && (
        <AvatarStack max={6}>
          {confirmed.map(p => (
            <Avatar key={p.id} name={p.user.name} size="md" />
          ))}
        </AvatarStack>
      )}
    </div>
  )
}
