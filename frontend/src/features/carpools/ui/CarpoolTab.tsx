import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Truck } from 'lucide-react'
import type { Event } from '@/entities/event/model/types'
import { useAddCarpool, useJoinCarpool } from '@/features/carpools/model/hooks'
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

export default function CarpoolTab({ event }: { event: Event }) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [departure, setDeparture] = useState('')
  const [seats, setSeats] = useState('3')

  const addCarpool = useAddCarpool(event.id)
  const joinCarpool = useJoinCarpool(event.id)

  const isDriver = event.carpools.some(c => c.driver.is_me)
  const isCompleted = event.status === 'completed'
  const freeSeatsTotal = event.carpools.reduce(
    (sum, carpool) => sum + Math.max(0, carpool.seats_available - carpool.passengers.length),
    0,
  )
  const departureTimes = event.carpools
    .flatMap(carpool => carpool.departure_point.match(/\b(?:[01]\d|2[0-3]):[0-5]\d\b/g) ?? [])
    .sort()
  const departureWindow = departureTimes.length === 0
    ? t('carpools.byAgreement')
    : departureTimes.length === 1
      ? departureTimes[0]
      : `${departureTimes[0]}–${departureTimes[departureTimes.length - 1]}`

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
    <div>
      <EventSectionHeader
        kicker={t('carpools.kicker')}
        title={t('carpools.sectionTitle')}
        description={t('carpools.description', { count: event.carpools.length })}
        action={!isDriver && !isCompleted ? (
          <Button size="md" onClick={() => setOpen(v => !v)}>
            <Plus size={14} /> {t('carpools.offerSeats')}
          </Button>
        ) : undefined}
      />

      {open && (
        <div className="mt-[18px] flex flex-col gap-3 rounded-[15px] border border-line bg-bg-2/55 p-3.5">
          <div>
            <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-ink-3">
              {t('carpools.fieldDeparture')}
            </div>
            <Input
              value={departure}
              onChange={e => setDeparture(e.target.value)}
              placeholder={t('carpools.fieldDeparturePlaceholder')}
              autoFocus
            />
          </div>
          <div>
            <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-ink-3">
              {t('carpools.fieldSeats')}
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
              {t('common.cancel')}
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={addCarpool.isPending}>
              {t('common.create')}
            </Button>
          </div>
        </div>
      )}

      <EventSectionStats>
        <EventSectionStat label={t('carpools.statCars')} value={t('carpools.carsCount', { count: event.carpools.length })} />
        <EventSectionStat label={t('carpools.statSeats')} value={t('carpools.freeSeatsCount', { count: freeSeatsTotal })} />
        <EventSectionStat label={t('carpools.statDeparture')} value={departureWindow} />
      </EventSectionStats>

      {event.carpools.length === 0 ? (
        <EventSectionEmpty icon={Truck}>{t('carpools.empty')}</EventSectionEmpty>
      ) : (
        <EventSectionList>
          {event.carpools.map(carpool => {
            const freeSeats = carpool.seats_available - carpool.passengers.length
            const iAmDriver = carpool.driver.is_me
            const iAmPassenger = carpool.passengers.some(p => p.is_me)
            const hasFree = freeSeats > 0
            const initials = carpool.driver.name
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map(part => part[0])
              .join('')
              .toUpperCase()

            return (
              <EventSectionDataRow
                key={carpool.id}
                avatar={initials}
                name={carpool.driver.name}
                note={t('carpools.departureFrom', { point: carpool.departure_point })}
                status={!iAmDriver && !isDriver && !isCompleted ? (
                  <button
                    type="button"
                    disabled={(!iAmPassenger && !hasFree) || joinCarpool.isPending}
                    onClick={() => user && joinCarpool.mutate(carpool.id)}
                    className="font-bold text-success transition hover:opacity-70 disabled:text-ink-3 disabled:opacity-60"
                  >
                    {iAmPassenger
                      ? t('carpools.buttonLeave')
                      : t('carpools.seatsCount', { count: freeSeats })}
                  </button>
                ) : t('carpools.seatsCount', { count: freeSeats })}
                statusTone={hasFree ? 'success' : 'neutral'}
              />
            )
          })}
        </EventSectionList>
      )}
    </div>
  )
}
