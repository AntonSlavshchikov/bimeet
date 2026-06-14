import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, ShoppingBag } from 'lucide-react'
import type { Event } from '@/entities/event/model/types'
import { useAddItem, useAssignItem } from '@/features/items/model/hooks'
import { Avatar, Button, Input, StatusPill, StatusPillButton } from '@/shared/ui'

export default function ItemsTab({ event }: { event: Event }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')

  const addItem = useAddItem(event.id)
  const assignItem = useAssignItem(event.id)
  const isCompleted = event.status === 'completed'

  function handleAdd() {
    if (!name.trim()) return
    addItem.mutate(name.trim(), {
      onSuccess: () => { setName(''); setOpen(false) },
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
          {t('items.sectionTitle', 'Что брать')}
        </div>
        {!isCompleted && (
          <Button variant="outline" size="sm" onClick={() => setOpen(v => !v)}>
            <Plus size={13} /> {t('common.add', 'Добавить')}
          </Button>
        )}
      </div>

      {open && (
        <div className="rounded-[12px] border border-line bg-bg-2 p-3.5 flex flex-col gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3 mb-1.5">
              {t('items.fieldName', 'Название')}
            </div>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('items.fieldNamePlaceholder', 'Шашлык, плед, мангал...')}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setName('') }}>
              {t('common.cancel', 'Отмена')}
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={addItem.isPending}>
              {t('common.add', 'Добавить')}
            </Button>
          </div>
        </div>
      )}

      {event.items.length === 0 ? (
        <div className="rounded-[12px] border border-line bg-surface py-12 px-4 flex flex-col items-center gap-2">
          <ShoppingBag size={26} className="text-ink-3" />
          <p className="text-[13px] text-ink-3">{t('items.empty', 'Список пуст — добавьте, что нужно взять.')}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[12px] border border-line bg-surface [&>*+*]:border-t [&>*+*]:border-line-soft">
          {event.items.map(item => {
            const isMine = item.assigned_to?.is_me ?? false
            const isTaken = Boolean(item.assigned_to)
            return (
              <div key={item.id} className="flex items-center justify-between gap-3 p-3.5">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {item.assigned_to ? (
                    <Avatar name={item.assigned_to.name} size="md" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-bg-2 border border-line-soft shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium text-ink truncate">{item.name}</div>
                    <div className="text-[12px] text-ink-3 truncate mt-0.5">
                      {item.assigned_to ? item.assigned_to.name : t('items.unassigned', 'Не занято')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isCompleted ? (
                    isTaken && !isMine && <StatusPill variant="going">{t('items.badgeTaken', 'Взято')}</StatusPill>
                  ) : isMine ? (
                    <StatusPillButton
                      variant="completed"
                      onClick={() => assignItem.mutate({ itemId: item.id, assigned: false })}
                      disabled={assignItem.isPending}
                    >
                      {t('items.buttonGiveUp', 'Отказаться')}
                    </StatusPillButton>
                  ) : !isTaken ? (
                    <StatusPillButton
                      variant="action"
                      onClick={() => assignItem.mutate({ itemId: item.id, assigned: true })}
                      disabled={assignItem.isPending}
                    >
                      {t('items.buttonTake', 'Возьму')}
                    </StatusPillButton>
                  ) : (
                    <StatusPill variant="going">{t('items.badgeTaken', 'Взято')}</StatusPill>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
