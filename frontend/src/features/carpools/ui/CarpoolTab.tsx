import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin, Plus, Truck, Users } from 'lucide-react'
import type { Event } from '@/entities/event/model/types'
import { useAddCarpool, useJoinCarpool } from '@/features/carpools/model/hooks'
import { useAuth } from '@/features/auth/model/AuthContext'
import { Avatar, AvatarStack, Button, Input, StatusPill } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

export default function CarpoolTab({ event }: { event: Event }) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [departure, setDeparture] = useState('')
  const [seats, setSeats] = useState('3')

  const addCarpool = useAddCarpool(event.id)
  const joinCarpool = useJoinCarpool(event.id)

  const isDriver = event.carpools.some(c => c.driver.id === user?.id)
  const isCompleted = event.status === 'completed'

  function handleCreate() {
    if (!departure.trim() || !seats) return
    addCarpool.mutate(
      { departure_point: departure.trim(), seats_available: Number(seats) },
      {
        onSuccess: () => {
          setDeparture('')
          setSeats('3')
          setOpen(false)
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
          {t('carpools.sectionTitle', 'Попутчики')}
        </div>
        {!isDriver && !isCompleted && (
          <Button variant="outline" size="sm" onClick={() => setOpen(v => !v)}>
            <Plus size={13} /> {t('carpools.offerSeats', 'Предложить место')}
          </Button>
        )}
      </div>

      {open && (
        <div className="rounded-[12px] border border-line bg-bg-2 p-3.5 flex flex-col gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3 mb-1.5">
              {t('carpools.fieldDeparture', 'Откуда едете')}
            </div>
            <Input
              value={departure}
              onChange={e => setDeparture(e.target.value)}
              placeholder={t('carpools.fieldDeparturePlaceholder', 'м. Сокол, 5:45')}
              autoFocus
            />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3 mb-1.5">
              {t('carpools.fieldSeats', 'Свободных мест')}
            </div>
            <Input
              type="number"
              min={1}
              max={8}
              value={seats}
              onChange={e => setSeats(e.target.value)}
              className="max-w-[120px]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              {t('common.cancel', 'Отмена')}
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={addCarpool.isPending}>
              {t('common.create', 'Создать')}
            </Button>
          </div>
        </div>
      )}

      {event.carpools.length === 0 ? (
        <div className="rounded-[12px] border border-line bg-surface py-12 px-4 flex flex-col items-center gap-2">
          <Truck size={26} className="text-ink-3" />
          <p className="text-[13px] text-ink-3">{t('carpools.empty', 'Пока никто не предложил подвезти.')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {event.carpools.map(carpool => {
            const freeSeats = carpool.seats_available - carpool.passengers.length
            const iAmDriver = carpool.driver.id === user?.id
            const iAmPassenger = carpool.passengers.some(p => p.id === user?.id)
            const hasFree = freeSeats > 0
            return (
              <div key={carpool.id} className="rounded-[12px] border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={carpool.driver.name} size="md" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[14px] font-medium text-ink truncate">{carpool.driver.name}</span>
                        {iAmDriver && (
                          <span className="inline-flex items-center rounded-[4px] px-1.5 py-[1px] text-[10px] font-semibold uppercase tracking-[0.04em] text-accent bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)]">
                            {t('carpools.badgeYou', 'Вы')}
                          </span>
                        )}
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-[12px] text-ink-3 mt-0.5">
                        <MapPin size={11} className="shrink-0" />
                        <span className="truncate">{carpool.departure_point}</span>
                      </div>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1.5 shrink-0">
                    <Users size={13} className="text-ink-3" />
                    <span className={cn('text-[13px] font-semibold tnum', hasFree ? 'text-success' : 'text-danger')}>
                      {freeSeats}/{carpool.seats_available}
                    </span>
                  </div>
                </div>

                {carpool.passengers.length > 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[12px] text-ink-3">{t('carpools.passengers', 'Пассажиры:')}</span>
                    <AvatarStack max={6}>
                      {carpool.passengers.map(p => (
                        <Avatar key={p.id} name={p.name} size="xs" />
                      ))}
                    </AvatarStack>
                  </div>
                )}

                {!iAmDriver && !isDriver && !isCompleted && (
                  <Button
                    className="w-full"
                    variant={iAmPassenger ? 'outline' : 'primary'}
                    disabled={(!iAmPassenger && !hasFree) || joinCarpool.isPending}
                    onClick={() => user && joinCarpool.mutate(carpool.id)}
                  >
                    {iAmPassenger
                      ? t('carpools.buttonLeave', 'Отказаться')
                      : !hasFree
                        ? t('carpools.buttonNoSeats', 'Мест нет')
                        : t('carpools.buttonJoin', 'Присоединиться')}
                  </Button>
                )}
                {iAmPassenger && (
                  <div className="mt-2 inline-flex"><StatusPill variant="going">{t('carpools.statusOnboard', 'Вы едете')}</StatusPill></div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
