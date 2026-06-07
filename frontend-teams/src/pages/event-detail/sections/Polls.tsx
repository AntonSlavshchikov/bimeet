import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { EventDetail, PollInfo } from '@/entities/event/types'
import type { useEventDetailMutations } from '@/features/event-detail/hooks'
import { Button, Input, Textarea } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

type Mutations = ReturnType<typeof useEventDetailMutations>

export function PollsSection({
  event,
  userId,
  active,
  m,
}: {
  event: EventDetail
  userId?: string
  active: boolean
  m: Mutations
}) {
  const [creating, setCreating] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      {active && !creating && (
        <Button variant="outline" onClick={() => setCreating(true)} className="self-start">
          <Plus size={15} /> Создать опрос
        </Button>
      )}
      {creating && <PollForm m={m} onDone={() => setCreating(false)} />}

      {event.polls.length === 0 && !creating ? (
        <p className="text-[13.5px] text-ink-3 py-2">Опросов пока нет — например, «когда удобнее перенести синк?».</p>
      ) : (
        event.polls.map(poll => <PollCard key={poll.id} poll={poll} userId={userId} active={active} m={m} />)
      )}
    </div>
  )
}

function PollForm({ m, onDone }: { m: Mutations; onDone: () => void }) {
  const [question, setQuestion] = useState('')
  const [optionsText, setOptionsText] = useState('')
  const [error, setError] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const options = optionsText.split('\n').map(s => s.trim()).filter(Boolean)
    if (!question.trim() || options.length < 2) {
      setError('Нужен вопрос и минимум два варианта')
      return
    }
    m.createPoll.mutate({ question, options }, { onSuccess: onDone })
  }

  return (
    <form onSubmit={submit} className="rounded-[var(--radius-card)] border border-line bg-surface p-4 flex flex-col gap-3">
      <Input placeholder="Вопрос" value={question} onChange={e => setQuestion(e.target.value)} required autoFocus />
      <Textarea placeholder={'Варианты — по одному на строку\nПонедельник\nВторник'} rows={3}
        value={optionsText} onChange={e => setOptionsText(e.target.value)} />
      {error && <p className="text-[13px] text-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Отмена</Button>
        <Button type="submit" loading={m.createPoll.isPending}>Создать</Button>
      </div>
    </form>
  )
}

function PollCard({ poll, userId, active, m }: { poll: PollInfo; userId?: string; active: boolean; m: Mutations }) {
  const total = poll.options.reduce((s, o) => s + o.votes.length, 0)
  const myOption = poll.options.find(o => userId && o.votes.includes(userId))?.id

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
      <div className="text-[14px] font-semibold text-ink mb-3">{poll.question}</div>
      <div className="flex flex-col gap-2">
        {poll.options.map(o => {
          const pct = total ? Math.round((o.votes.length / total) * 100) : 0
          const mine = o.id === myOption
          return (
            <button
              key={o.id}
              disabled={!active || m.vote.isPending}
              onClick={() => m.vote.mutate({ pollId: poll.id, optionId: o.id })}
              className={cn(
                'relative overflow-hidden text-left rounded-[var(--radius-control)] border px-3 py-2 transition',
                mine ? 'border-accent' : 'border-line hover:bg-hover',
                active ? 'cursor-pointer' : 'cursor-default',
              )}
            >
              <span className="absolute inset-y-0 left-0 bg-accent/10" style={{ width: `${pct}%` }} aria-hidden />
              <span className="relative flex items-center justify-between">
                <span className={cn('text-[13.5px]', mine ? 'font-semibold text-accent' : 'text-ink-2')}>{o.label}</span>
                <span className="text-[12.5px] text-ink-3 tnum">{o.votes.length} · {pct}%</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
