import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart3, Check, Plus, Trash2 } from 'lucide-react'
import type { Event } from '@/entities/event/model/types'
import { useAddPoll, useVote } from '@/features/polls/model/hooks'
import { useAuth } from '@/features/auth/model/AuthContext'
import { Button, Input } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

export default function PollsTab({ event }: { event: Event }) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
          {t('polls.sectionTitle', 'Опросы')}
        </div>
        {isOrganizer && !isCompleted && (
          <Button variant="outline" size="sm" onClick={() => setOpen(v => !v)}>
            <Plus size={13} /> {t('polls.newPoll', 'Новый опрос')}
          </Button>
        )}
      </div>

      {open && (
        <div className="rounded-[12px] border border-line bg-bg-2 p-3.5 flex flex-col gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3 mb-1.5">
              {t('polls.fieldQuestion', 'Вопрос')}
            </div>
            <Input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder={t('polls.fieldQuestionPlaceholder', 'Где встречаемся?')}
              autoFocus
            />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3 mb-1.5">
              {t('polls.fieldOptions', 'Варианты')}
            </div>
            <div className="flex flex-col gap-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={opt}
                    onChange={e => setOptions(o => o.map((v, idx) => (idx === i ? e.target.value : v)))}
                    placeholder={t('polls.optionPlaceholder', { number: i + 1, defaultValue: `Вариант ${i + 1}` })}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      aria-label={t('polls.deleteOption', 'Удалить вариант')}
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
                + {t('polls.addOption', 'Добавить вариант')}
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              {t('common.cancel', 'Отмена')}
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={addPoll.isPending}>
              {t('common.create', 'Создать')}
            </Button>
          </div>
        </div>
      )}

      {event.polls.length === 0 && (
        <div className="rounded-[12px] border border-line bg-surface py-12 px-4 flex flex-col items-center gap-2">
          <BarChart3 size={26} className="text-ink-3" />
          <p className="text-[13px] text-ink-3">{t('polls.empty', 'Опросов пока нет.')}</p>
        </div>
      )}

      {event.polls.map(poll => {
        const totalVotes = poll.options.reduce((s, o) => s + o.vote_count, 0)
        return (
          <div key={poll.id} className="rounded-[12px] border border-line bg-surface p-4">
            <div className="mb-3.5 flex items-center justify-between gap-3">
              <h3 className="min-w-0 truncate text-[12px] font-bold text-ink">{poll.question}</h3>
              <span className="shrink-0 text-[9px] text-ink-3">
                {t('eventInfo.votesCount', { count: totalVotes })}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {poll.options.map(option => {
                const pct = totalVotes > 0 ? Math.round((option.vote_count / totalVotes) * 100) : 0
                const isMy = option.voted
                return (
                  <button
                    type="button"
                    key={option.id}
                    aria-pressed={isMy}
                    disabled={isCompleted}
                    onClick={() => !isCompleted && user && castVote.mutate({ pollId: poll.id, optionId: option.id })}
                    className={cn(
                      'w-full rounded-[9px] p-2 text-left transition focus-ring',
                      isMy ? 'bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)]' : 'hover:bg-hover',
                      isCompleted ? 'cursor-default' : 'cursor-pointer',
                    )}
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-[10px] text-ink-2">
                      <span className={cn('flex min-w-0 items-center gap-1.5 truncate font-semibold', isMy ? 'text-accent' : 'text-ink')}>
                        {isMy && <Check size={11} strokeWidth={3} className="shrink-0" />}
                        {option.label}
                      </span>
                      <span className="shrink-0 tnum">
                        {option.vote_count} · {pct}%
                      </span>
                    </div>
                    <div className="h-[7px] w-full overflow-hidden rounded-full bg-bg-2">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-brand-rose),var(--color-brand-violet),var(--color-brand-sky))] transition-[width]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
