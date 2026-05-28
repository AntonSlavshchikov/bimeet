import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ExternalLink, Link2, Plus, Trash2 } from 'lucide-react'
import { useAddLink, useRemoveLink } from '@/features/links/model/hooks'
import { useAuth } from '@/features/auth/model/AuthContext'
import type { Event } from '@/entities/event/model/types'
import { Button, Input, useToast } from '@/shared/ui'

export default function LinksTab({ event }: { event: Event }) {
  const { user } = useAuth()
  const toast = useToast()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const addLink = useAddLink(event.id)
  const removeLink = useRemoveLink(event.id)

  const isOrganizer = event.organizer.id === user?.id
  const isCompleted = event.status === 'completed'
  const links = event.links ?? []

  function handleAdd() {
    if (!title.trim() || !url.trim()) {
      toast({ title: t('links.validationError', 'Заполните оба поля'), status: 'warning' })
      return
    }
    const fullUrl = url.startsWith('http') ? url : `https://${url}`
    addLink.mutate(
      { title: title.trim(), url: fullUrl },
      {
        onSuccess: () => {
          setTitle('')
          setUrl('')
          setOpen(false)
        },
        onError: err => toast({ title: t('common.error', 'Ошибка'), description: err.message, status: 'error' }),
      },
    )
  }

  function handleDelete(linkId: string) {
    removeLink.mutate(linkId, {
      onError: err =>
        toast({ title: t('links.deleteError', 'Не удалось удалить'), description: err.message, status: 'error' }),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
          {t('links.sectionTitle', 'Ссылки')}
        </div>
        {isOrganizer && !isCompleted && (
          <Button variant="outline" size="sm" onClick={() => setOpen(v => !v)}>
            <Plus size={13} /> {t('common.add', 'Добавить')}
          </Button>
        )}
      </div>

      {open && (
        <div className="rounded-[12px] border border-line bg-bg-2 p-3.5 flex flex-col gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3 mb-1.5">
              {t('links.fieldTitle', 'Название')}
            </div>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t('links.fieldTitlePlaceholder', 'Zoom-звонок')}
              autoFocus
            />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3 mb-1.5">
              {t('links.fieldUrl', 'URL')}
            </div>
            <Input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setTitle(''); setUrl('') }}>
              {t('common.cancel', 'Отмена')}
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={addLink.isPending}>
              {t('common.create', 'Создать')}
            </Button>
          </div>
        </div>
      )}

      {links.length === 0 ? (
        <div className="rounded-[12px] border border-line bg-surface py-12 px-4 flex flex-col items-center gap-2">
          <Link2 size={26} className="text-ink-3" />
          <p className="text-[13px] text-ink-3">
            {isOrganizer
              ? t('links.emptyOrganizer', 'Пока нет ссылок — добавьте Zoom-звонок или повестку.')
              : t('links.emptyParticipant', 'Пока нет ссылок.')}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[12px] border border-line bg-surface [&>*+*]:border-t [&>*+*]:border-line-soft">
          {links.map(link => (
            <div key={link.id} className="flex items-center gap-3 p-3.5 group hover:bg-hover transition">
              <Link2 size={14} className="text-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-ink truncate">{link.title}</div>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[12.5px] text-accent hover:opacity-80 truncate inline-flex items-center gap-1 max-w-full"
                >
                  <span className="truncate">{link.url}</span>
                  <ExternalLink size={10} className="shrink-0" />
                </a>
              </div>
              {isOrganizer && !isCompleted && (
                <button
                  type="button"
                  aria-label={t('links.deleteButton', 'Удалить')}
                  onClick={() => handleDelete(link.id)}
                  disabled={removeLink.isPending}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[7px] text-ink-3 hover:bg-danger/10 hover:text-danger transition disabled:opacity-40 shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
