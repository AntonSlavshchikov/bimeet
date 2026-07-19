import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart3, Check, ChevronDown, Plus, Trash2 } from 'lucide-react'
import type { Event } from '@/entities/event/model/types'
import { useAddPoll, useVote } from '@/features/polls/model/hooks'
import { useAuth } from '@/features/auth/model/AuthContext'
import {
  Button,
  EventSectionDataRow,
  EventSectionEmpty,
  EventSectionHeader,
  EventSectionList,
  EventSectionStat,
  EventSectionStats,
  Input,
} from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

export default function PollsTab({ event }: { event: Event }) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [expandedPollId, setExpandedPollId] = useState<string | null>(null)
  const [renderedAt] = useState(() => Date.now())
  const isOrganizer = event.organizer.is_me

  const addPoll = useAddPoll(event.id)
  const castVote = useVote(event.id)

  function handleCreate() {
    const valid = options.filter(o => o.trim())
    if (!question.trim() || valid.length < 2) return
    addPoll.mutate(
      { question: question.trim(), options: valid },
      {
        onSuccess: () => {
          setQuestion('')
          setOptions(['', ''])
          setOpen(false)
        },
      },
    )
  }

  const isCompleted = event.status === 'completed'
  const pollVoteTotals = event.polls.map(poll => poll.options.reduce((sum, option) => sum + option.vote_count, 0))
  const answeredParticipants = pollVoteTotals.length > 0 ? Math.max(...pollVoteTotals) : 0
  const participantCount = Math.max(event.participants.length, event.confirmed_count)
  const daysUntilEvent = Math.max(0, Math.ceil((new Date(event.date_start).getTime() - renderedAt) / 86_400_000))

  return (
    <div>
      <EventSectionHeader
        kicker={t('polls.kicker')}
        title={t('polls.sectionTitle')}
        description={t('polls.description', { count: event.polls.length })}
        action={isOrganizer && !isCompleted ? (
          <Button size="md" onClick={() => setOpen(v => !v)}>
            <Plus size={14} /> {t('polls.newPoll')}
          </Button>
        ) : undefined}
      />

      {open && (
        <div className="mt-[18px] flex flex-col gap-3 rounded-[15px] border border-line bg-bg-2/55 p-3.5">
          <div>
            <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-ink-3">
              {t('polls.fieldQuestion')}
            </div>
            <Input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder={t('polls.fieldQuestionPlaceholder')}
              autoFocus
            />
          </div>
          <div>
            <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-ink-3">
              {t('polls.fieldOptions')}
            </div>
            <div className="flex flex-col gap-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={opt}
                    onChange={e => setOptions(o => o.map((v, idx) => (idx === i ? e.target.value : v)))}
                    placeholder={t('polls.optionPlaceholder', { number: i + 1 })}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      aria-label={t('polls.deleteOption')}
                      onClick={() => setOptions(o => o.filter((_, idx) => idx !== i))}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-[9px] text-ink-3 hover:bg-danger/10 hover:text-danger transition shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setOptions(o => [...o, ''])}
                className="self-start text-[13px] font-semibold text-accent hover:opacity-80 transition"
              >
                {t('polls.addOption')}
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={addPoll.isPending}>
              {t('common.create')}
            </Button>
          </div>
        </div>
      )}

      <EventSectionStats>
        <EventSectionStat label={t('polls.statActive')} value={t('polls.pollsCount', { count: event.polls.length })} />
        <EventSectionStat
          label={t('polls.statAnswered')}
          value={t('polls.answeredCount', { answered: answeredParticipants, total: participantCount })}
        />
        <EventSectionStat label={t('polls.statUntilClose')} value={t('polls.daysCount', { count: daysUntilEvent })} />
      </EventSectionStats>

      {event.polls.length === 0 ? (
        <EventSectionEmpty icon={BarChart3}>{t('polls.empty')}</EventSectionEmpty>
      ) : (
        <EventSectionList>
          {event.polls.map((poll, pollIndex) => {
            const pollVotes = poll.options.reduce((sum, option) => sum + option.vote_count, 0)
            const isExpanded = expandedPollId === poll.id
            return (
              <EventSectionDataRow
                key={poll.id}
                avatar={['🍉', '🎵', '📍', '🗳️'][pollIndex % 4]}
                name={poll.question}
                note={t('polls.answersCount', { count: pollVotes })}
                status={<ChevronDown size={18} className={cn('transition-transform', isExpanded && 'rotate-180')} />}
                statusTone="neutral"
                onClick={() => setExpandedPollId(current => current === poll.id ? null : poll.id)}
                expanded={isExpanded}
                ariaLabel={poll.question}
                details={isExpanded ? (
                  <div className="flex flex-col gap-1.5">
                    {poll.options.map(option => {
                      const pct = pollVotes > 0 ? Math.round((option.vote_count / pollVotes) * 100) : 0
                      const isMy = option.voted
                      return (
                        <button
                          type="button"
                          key={option.id}
                          aria-pressed={isMy}
                          disabled={isCompleted}
                          onClick={() => !isCompleted && user && castVote.mutate({ pollId: poll.id, optionId: option.id })}
                          className={cn(
                            'focus-ring w-full rounded-[11px] border p-2.5 text-left transition',
                            isMy
                              ? 'border-accent/25 bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)]'
                              : 'border-line bg-bg-2/35 hover:bg-hover',
                            isCompleted ? 'cursor-default' : 'cursor-pointer',
                          )}
                        >
                          <div className="mb-1.5 flex items-center justify-between gap-3 text-[10px] text-ink-2">
                            <span className={cn('flex min-w-0 items-center gap-1.5 truncate font-semibold', isMy ? 'text-accent' : 'text-ink')}>
                              {isMy && <Check size={11} strokeWidth={3} className="shrink-0" />}
                              {option.label}
                            </span>
                            <span className="shrink-0 tnum">{option.vote_count} · {pct}%</span>
                          </div>
                          <div className="h-[7px] w-full overflow-hidden rounded-full bg-line-soft">
                            <div
                              className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-brand-a),var(--color-brand-b),var(--color-brand-c))] transition-[width]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : undefined}
              />
            )
          })}
        </EventSectionList>
      )}
    </div>
  )
}
