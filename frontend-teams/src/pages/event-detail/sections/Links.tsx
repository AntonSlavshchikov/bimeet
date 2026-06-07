import { useState } from 'react'
import { ExternalLink, Trash2 } from 'lucide-react'
import type { EventDetail } from '@/entities/event/types'
import type { useEventDetailMutations } from '@/features/event-detail/hooks'
import { Button, Input } from '@/shared/ui'

type Mutations = ReturnType<typeof useEventDetailMutations>

export function LinksSection({
  event,
  userId,
  isOrganizer,
  active,
  m,
}: {
  event: EventDetail
  userId?: string
  isOrganizer: boolean
  active: boolean
  m: Mutations
}) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')

  function add(e: React.FormEvent) {
    e.preventDefault()
    m.createLink.mutate(
      { title, url },
      {
        onSuccess: () => {
          setTitle('')
          setUrl('')
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {active && (
        <form onSubmit={add} className="flex flex-col sm:flex-row gap-2">
          <Input placeholder="Название" value={title} onChange={e => setTitle(e.target.value)} required className="sm:max-w-[200px]" />
          <Input placeholder="https://…" value={url} onChange={e => setUrl(e.target.value)} required />
          <Button type="submit" loading={m.createLink.isPending}>Добавить</Button>
        </form>
      )}

      {event.links.length === 0 ? (
        <p className="text-[13.5px] text-ink-3 py-2">Материалов пока нет — добавьте повестку, документы или ссылку на созвон.</p>
      ) : (
        <div className="rounded-[var(--radius-card)] border border-line bg-surface divide-y divide-line-soft">
          {event.links.map(l => {
            const canDelete = isOrganizer || l.created_by === userId
            return (
              <div key={l.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <a href={l.url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 text-[14px] text-accent hover:underline min-w-0">
                  <ExternalLink size={14} className="shrink-0" />
                  <span className="truncate">{l.title}</span>
                </a>
                {canDelete && active && (
                  <button onClick={() => m.deleteLink.mutate(l.id)} title="Удалить"
                    className="shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-[var(--radius-control)] text-ink-3 hover:text-danger hover:bg-hover">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
