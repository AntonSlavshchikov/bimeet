import { useState } from 'react'
import type { EventDetail } from '@/entities/event/types'
import type { useEventDetailMutations } from '@/features/event-detail/hooks'
import { Button, Input } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

type Mutations = ReturnType<typeof useEventDetailMutations>

const statusMeta: Record<string, { label: string; cls: string }> = {
  invited: { label: 'Приглашён', cls: 'text-accent' },
  confirmed: { label: 'Идёт', cls: 'text-success' },
  declined: { label: 'Отказался', cls: 'text-danger' },
}

export function ParticipantsSection({
  event,
  isOrganizer,
  active,
  m,
}: {
  event: EventDetail
  isOrganizer: boolean
  active: boolean
  m: Mutations
}) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  function invite(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    m.inviteParticipant.mutate(email, {
      onSuccess: () => setEmail(''),
      onError: err => setError(err instanceof Error ? err.message : 'Не удалось пригласить'),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {isOrganizer && active && (
        <form onSubmit={invite} className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="email коллеги из компании"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <Button type="submit" loading={m.inviteParticipant.isPending}>Пригласить</Button>
          </div>
          {error && <p className="text-[13px] text-danger">{error}</p>}
        </form>
      )}

      <div className="rounded-[var(--radius-card)] border border-line bg-surface divide-y divide-line-soft">
        {event.participants.map(p => {
          const meta = statusMeta[p.status]
          return (
            <div key={p.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <div className="text-[14px] font-medium text-ink truncate">{p.user.name}</div>
                <div className="text-[12.5px] text-ink-3 truncate">{p.user.email}</div>
              </div>
              <span className={cn('text-[12.5px] font-semibold', meta?.cls)}>{meta?.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
