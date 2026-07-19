import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link2, UserPlus, Users } from 'lucide-react'
import type { Event } from '@/entities/event/model/types'
import { useInviteParticipant, useUpdateParticipantStatus } from '@/features/participants/model/hooks'
import {
  Button,
  EventSectionDataRow,
  EventSectionEmpty,
  EventSectionHeader,
  EventSectionList,
  EventSectionStat,
  EventSectionStats,
  Input,
  useToast,
} from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

export default function ParticipantsTab({ event }: { event: Event }) {
  const toast = useToast()
  const { t } = useTranslation()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [email, setEmail] = useState('')

  const updateStatus = useUpdateParticipantStatus(event.id)
  const invite = useInviteParticipant(event.id)

  const isOrganizer = event.organizer.is_me
  const myParticipant = event.participants.find(p => p.user.is_me)
  const organizerIsListed = event.participants.some(p => p.is_organizer || p.user.email === event.organizer.email)
  const displayedParticipants = organizerIsListed
    ? event.participants
    : [{ user: event.organizer, status: 'confirmed' as const, is_organizer: true }, ...event.participants]
  const confirmed = event.confirmed_count
  const invited = event.participants.filter(p => p.status === 'invited').length
  const freeSpots = event.max_guests == null ? null : Math.max(0, event.max_guests - confirmed)
  const isCompleted = event.status === 'completed'

  function handleInvite() {
    if (!email.trim()) return
    invite.mutate(email.trim(), {
      onSuccess: () => {
        toast({ title: t('participants.inviteSent'), status: 'success' })
        setEmail('')
        setInviteOpen(false)
      },
      onError: err => toast({ title: t('common.error'), description: err.message, status: 'error' }),
    })
  }

  function handleCopyLink() {
    const link = `${window.location.origin}/invite/${event.invite_token}`
    navigator.clipboard.writeText(link).then(() => {
      toast({ title: t('participants.linkCopied'), status: 'success' })
    })
  }

  return (
    <div>
      <EventSectionHeader
        kicker={t('participants.kicker')}
        title={t('eventInfo.peopleTab')}
        description={t('participants.description', {
          confirmed,
          free: freeSpots ?? t('participants.noLimit'),
        })}
        action={isOrganizer && !isCompleted ? (
          <Button size="md" onClick={() => setInviteOpen(v => !v)}>
            <UserPlus size={14} />
            {t('participants.inviteButton')}
          </Button>
        ) : undefined}
      />

      {myParticipant && !isOrganizer && !isCompleted && (
        <div className="mt-[18px] rounded-[15px] border border-line bg-bg-2/55 p-3.5">
          <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.07em] text-ink-3">
            {t('participants.myStatusTitle')}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              className={cn('w-full', myParticipant.status === 'confirmed' && 'ring-2 ring-accent/30')}
              variant={myParticipant.status === 'confirmed' ? 'primary' : 'outline'}
              size="sm"
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ status: 'confirmed' })}
            >
              {t('participants.going')}
            </Button>
            <Button
              className="w-full"
              variant={myParticipant.status === 'declined' ? 'danger' : 'outline'}
              size="sm"
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ status: 'declined' })}
            >
              {t('participants.notGoing')}
            </Button>
          </div>
        </div>
      )}

      {inviteOpen && (
        <div className="mt-[18px] rounded-[15px] border border-line bg-bg-2/55 p-3.5">
          <div className="mb-2 text-[9px] font-bold uppercase tracking-[0.08em] text-ink-3">
            {t('participants.emailLabel')}
          </div>
          <div className="flex flex-col gap-2 min-[541px]:flex-row">
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="user@example.com"
              onKeyDown={e => e.key === 'Enter' && handleInvite()}
              autoFocus
            />
            <div className="flex shrink-0 justify-end gap-2">
              <Button size="sm" variant="soft" onClick={handleCopyLink}>
                <Link2 size={13} />
                {t('participants.copyLink')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setInviteOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button size="sm" onClick={handleInvite} disabled={invite.isPending}>
                {t('participants.inviteButton')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <EventSectionStats>
        <EventSectionStat label={t('participants.statGoing')} value={t('participants.peopleCount', { count: confirmed })} />
        <EventSectionStat label={t('participants.statInvited')} value={t('participants.peopleCount', { count: invited })} />
        <EventSectionStat
          label={t('participants.statFree')}
          value={freeSpots == null ? t('participants.noLimit') : t('participants.spotsCount', { count: freeSpots })}
        />
      </EventSectionStats>

      {displayedParticipants.length === 0 ? (
        <EventSectionEmpty icon={Users}>{t('participants.empty')}</EventSectionEmpty>
      ) : (
        <EventSectionList>
          {displayedParticipants.map(p => {
            const initials = p.user.name
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map(part => part[0])
              .join('')
              .toUpperCase()
            const statusTone = p.status === 'confirmed' ? 'success' : p.status === 'invited' ? 'warning' : 'danger'
            const note = p.is_organizer
              ? t('participants.noteOrganizer')
              : p.status === 'confirmed'
                ? t('participants.noteConfirmed')
                : p.status === 'invited'
                  ? t('participants.noteInvited')
                  : t('participants.noteDeclined')
            const status = p.is_organizer
              ? t('participants.organizerStatus')
              : t(`participants.status${p.status.charAt(0).toUpperCase()}${p.status.slice(1)}`)
            return (
              <EventSectionDataRow
                key={p.user.email}
                avatar={initials}
                name={p.user.name}
                note={note}
                status={status}
                statusTone={p.is_organizer ? 'success' : statusTone}
              />
            )
          })}
        </EventSectionList>
      )}
    </div>
  )
}
