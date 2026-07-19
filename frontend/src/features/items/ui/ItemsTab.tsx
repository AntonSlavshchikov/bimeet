import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, ShoppingBag } from 'lucide-react'
import type { Event } from '@/entities/event/model/types'
import { useAddItem, useAssignItem } from '@/features/items/model/hooks'
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

export default function ItemsTab({ event }: { event: Event }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')

  const addItem = useAddItem(event.id)
  const assignItem = useAssignItem(event.id)
  const isCompleted = event.status === 'completed'
  const assigned = event.items.filter(item => item.assigned_to).length
  const remaining = event.items.length - assigned

  function handleAdd() {
    if (!name.trim()) return
    addItem.mutate(name.trim(), {
      onSuccess: () => { setName(''); setOpen(false) },
    })
  }

  return (
    <div>
      <EventSectionHeader
        kicker={t('items.kicker')}
        title={t('items.sectionTitle')}
        description={t('items.description')}
        action={!isCompleted ? (
          <Button size="md" onClick={() => setOpen(v => !v)}>
            <Plus size={14} /> {t('items.addItem')}
          </Button>
        ) : undefined}
      />

      {open && (
        <div className="mt-[18px] flex flex-col gap-3 rounded-[15px] border border-line bg-bg-2/55 p-3.5">
          <div>
            <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-ink-3">
              {t('items.fieldName')}
            </div>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('items.fieldNamePlaceholder')}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setName('') }}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={addItem.isPending}>
              {t('common.add')}
            </Button>
          </div>
        </div>
      )}

      <EventSectionStats>
        <EventSectionStat label={t('items.statTotal')} value={t('items.itemsCount', { count: event.items.length })} />
        <EventSectionStat label={t('items.statAssigned')} value={t('items.itemsCount', { count: assigned })} />
        <EventSectionStat label={t('items.statRemaining')} value={t('items.itemsCount', { count: remaining })} />
      </EventSectionStats>

      {event.items.length === 0 ? (
        <EventSectionEmpty icon={ShoppingBag}>{t('items.empty')}</EventSectionEmpty>
      ) : (
        <EventSectionList>
          {event.items.map(item => {
            const isMine = item.assigned_to?.is_me ?? false
            const isTaken = Boolean(item.assigned_to)
            return (
              <EventSectionDataRow
                key={item.id}
                avatar={isTaken ? '✓' : '+'}
                name={item.name}
                note={item.assigned_to
                  ? t('items.takenBy', { name: item.assigned_to.name })
                  : t('items.unassigned')}
                status={!isTaken ? (
                  isCompleted ? (
                    <span className="inline-flex rounded-full bg-warning/12 px-2.5 py-1 text-warning">
                      {t('items.needsPerson')}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={assignItem.isPending}
                      onClick={() => assignItem.mutate({ itemId: item.id, assigned: true })}
                      className="inline-flex rounded-full bg-warning/12 px-2.5 py-1 font-bold text-warning transition hover:bg-warning/20 disabled:opacity-40"
                    >
                      {t('items.needsPerson')}
                    </button>
                  )
                ) : isMine && !isCompleted ? (
                  <button
                    type="button"
                    disabled={assignItem.isPending}
                    onClick={() => assignItem.mutate({ itemId: item.id, assigned: false })}
                    className="font-bold text-success transition hover:opacity-70 disabled:opacity-40"
                  >
                    {t('items.ready')}
                  </button>
                ) : t('items.ready')}
                statusTone={isTaken ? 'success' : 'warning'}
              />
            )
          })}
        </EventSectionList>
      )}
    </div>
  )
}
