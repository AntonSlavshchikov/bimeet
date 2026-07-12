import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link2, RefreshCw, UserPlus } from 'lucide-react'
import type { Event } from '@/entities/event/model/types'
import { useInviteParticipant, useUpdateParticipantStatus } from '@/features/participants/model/hooks'
import { useRotateInviteToken } from '@/features/event-manage/model/hooks'
import {
  Avatar,
  Button,
  Input,
  ListGroup,
  ListRow,
  StatusPill,
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
  const rotateInviteToken = useRotateInviteToken(event.id)

  const isOrganizer = event.organizer.is_me
  const myParticipant = event.participants.find(p => p.user.is_me)

  const confirmed = event.participants.filter(p => p.status === 'confirmed').length
  const invited = event.participants.filter(p => p.status === 'invited').length
  const declined = event.participants.filter(p => p.status === 'declined').length

  const isCompleted = event.status === 'completed'
  const inviteExpired = !event.invite_token

  function handleInvite() {
    if (!email.trim()) return
    invite.mutate(email.trim(), {
      onSuccess: () => {
        toast({ title: t('participants.inviteSent', 'Приглашение отправлено'), status: 'success' })
        setEmail('')
        setInviteOpen(false)
      },
      onError: err => toast({ title: t('common.error', 'Ошибка'), description: err.message, status: 'error' }),
    })
  }

  function handleCopyLink() {
	if (!event.invite_token || inviteExpired) return
    const link = `${window.location.origin}/invite/${event.invite_token}`
    navigator.clipboard.writeText(link).then(() => {
      toast({ title: t('participants.linkCopied', 'Ссылка скопирована'), status: 'success' })
    })
  }

  function handleRefreshLink() {
    rotateInviteToken.mutate(undefined, {
      onSuccess: result => {
        const link = `${window.location.origin}/invite/${result.invite_token}`
        navigator.clipboard.writeText(link).then(() => {
          toast({ title: t('participants.linkRefreshed'), status: 'success' })
        })
      },
      onError: err => toast({ title: t('common.error'), description: err.message, status: 'error' }),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Мой статус */}
      {myParticipant && !isOrganizer && !isCompleted && (
        <div className="rounded-[12px] border border-line bg-bg-2 p-3.5">
          <div className="text-[13px] font-medium text-ink-2 mb-2.5">
            {t('participants.myStatusTitle', 'Моё участие')}
          </div>
          <div className="flex gap-2">
            <Button
              className={cn('flex-1', myParticipant.status === 'confirmed' && 'bg-success hover:bg-success')}
              variant={myParticipant.status === 'confirmed' ? 'primary' : 'outline'}
              size="sm"
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ status: 'confirmed' })}
            >
              {t('participants.going', 'Иду')}
            </Button>
            <Button
              className={cn('flex-1', myParticipant.status === 'declined' && 'bg-danger hover:bg-danger')}
              variant={myParticipant.status === 'declined' ? 'danger' : 'outline'}
              size="sm"
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ status: 'declined' })}
            >
              {t('participants.notGoing', 'Не иду')}
            </Button>
          </div>
        </div>
      )}

      {/* Действия организатора */}
      {isOrganizer && !isCompleted && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" size="md" className="flex-1" onClick={() => setInviteOpen(v => !v)} disabled={inviteExpired}>
            <UserPlus size={14} />
            {t('participants.inviteByEmail', 'Пригласить по email')}
          </Button>
          <Button variant="outline" size="md" className="flex-1" onClick={handleCopyLink} disabled={inviteExpired}>
            <Link2 size={14} />
            {inviteExpired ? t('participants.linkExpired') : t('participants.copyLink')}
          </Button>
          <Button variant="outline" size="md" className="flex-1" onClick={handleRefreshLink} disabled={rotateInviteToken.isPending}>
            <RefreshCw size={14} />
            {t('participants.refreshLink')}
          </Button>
        </div>
      )}

      {inviteOpen && (
        <div className="rounded-[12px] border border-line bg-bg-2 p-3.5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3 mb-2">
            {t('participants.emailLabel', 'Email участника')}
          </div>
          <div className="flex flex-col gap-2">
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="user@example.com"
              onKeyDown={e => e.key === 'Enter' && handleInvite()}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setInviteOpen(false)}>
                {t('common.cancel', 'Отмена')}
              </Button>
              <Button size="sm" onClick={handleInvite} disabled={invite.isPending}>
                {t('participants.inviteButton', 'Пригласить')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Счётчики */}
      <div className="flex flex-wrap gap-1.5">
        <StatusPill variant="going">
          {t('participants.badgeCount_going', { count: confirmed, defaultValue: `${confirmed} идут` })}
        </StatusPill>
        <StatusPill variant="invited">
          {t('participants.badgeCount_invited', { count: invited, defaultValue: `${invited} приглашены` })}
        </StatusPill>
        {declined > 0 && (
          <StatusPill variant="completed">
            {t('participants.badgeCount_declined', { count: declined, defaultValue: `${declined} отказались` })}
          </StatusPill>
        )}
      </div>

      {/* Список участников */}
      {event.participants.length > 0 && (
        <ListGroup>
          {event.participants.map(p => {
            const isOrg = p.is_organizer
            const statusVariant =
              p.status === 'confirmed' ? 'going'
              : p.status === 'invited' ? 'invited'
              : 'completed'
            return (
              <ListRow key={p.user.email} accent="gray">
                <div className="grid grid-cols-[1fr_auto] gap-3 items-center py-3 pr-3 w-full">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={p.user.name} size="md" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[14px] font-medium text-ink truncate min-w-0">{p.user.name}</span>
                        {isOrg && (
                          <span className="inline-flex items-center rounded-[4px] px-1.5 py-[1px] text-[10px] font-semibold uppercase tracking-[0.04em] text-purple bg-[color-mix(in_srgb,var(--color-purple)_12%,transparent)]">
                            {t('participants.badgeOrganizer', 'Организатор')}
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-ink-3 truncate">{p.user.email}</div>
                    </div>
                  </div>
                  <StatusPill variant={statusVariant} size="sm">
                    {t(`participants.status${p.status.charAt(0).toUpperCase()}${p.status.slice(1)}`)}
                  </StatusPill>
                </div>
              </ListRow>
            )
          })}
        </ListGroup>
      )}
    </div>
  )
}
