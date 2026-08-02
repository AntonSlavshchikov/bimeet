import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { useEvent } from '@/entities/event/queries'
import { useCreateEvent, useUpdateEvent } from '@/features/event-manage/model/hooks'
import { Button, DateRangePicker, Input, PageHeader, SegmentedControl, Textarea, useToast } from '@/shared/ui'
import LocationPicker from '@/features/location-picker/ui/LocationPicker'
import CitySelect from '@/features/city-select/ui/CitySelect'
import { cn } from '@/shared/lib/cn'

interface FormValues {
  title: string
  description: string
  dateStart: string
  dateEnd: string
  location: string
  locationLat?: number
  locationLng?: number
  cityId: string
  dressCode: string
  isPublic: boolean
  maxGuests: string
}

type DateSelectionMode = 'single' | 'range'

function toDatetimeLocal(iso: string) {
  if (!iso) return ''
  return iso.slice(0, 16)
}

function datePart(value: string) {
  return value.slice(0, 10)
}

function timePart(value: string, fallback: string) {
  return value.slice(11, 16) || fallback
}

function combineDateTime(date: string, time: string) {
  return date ? `${date}T${time}` : ''
}

function todayIsoDay() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

function ensureEndTimeAfterStart(startTime: string, endTime: string) {
  const [startHours, startMinutes] = startTime.split(':').map(Number)
  const [endHours, endMinutes] = endTime.split(':').map(Number)
  const start = startHours * 60 + startMinutes
  const end = endHours * 60 + endMinutes
  if (end > start) return endTime

  const adjusted = Math.min(start + 60, 23 * 60 + 59)
  return `${String(Math.floor(adjusted / 60)).padStart(2, '0')}:${String(adjusted % 60).padStart(2, '0')}`
}

export default function EventFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()
  const { t, i18n } = useTranslation()

  const event = useEvent(id ?? '')
  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent(id ?? '')
  const [dateSelectionMode, setDateSelectionMode] = useState<DateSelectionMode>('single')

  const [form, setForm] = useState<FormValues>({
    title: '',
    description: '',
    dateStart: '',
    dateEnd: '',
    location: '',
    cityId: '',
    dressCode: '',
    isPublic: false,
    maxGuests: '',
  })

  useEffect(() => {
    if (event) {
      setForm({
        title: event.title,
        description: event.description,
        dateStart: toDatetimeLocal(event.date_start),
        dateEnd: toDatetimeLocal(event.date_end),
        location: event.location,
        locationLat: event.location_lat,
        locationLng: event.location_lng,
        cityId: event.city?.id ?? '',
        dressCode: event.dress_code ?? '',
        isPublic: event.is_public ?? false,
        maxGuests: event.max_guests != null ? String(event.max_guests) : '',
      })
      setDateSelectionMode(datePart(event.date_start) === datePart(event.date_end) ? 'single' : 'range')
    }
  }, [event])

  function update<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function updateDateRange(startDate: string, endDate: string) {
    setForm(f => ({
      ...f,
      dateStart: combineDateTime(startDate, timePart(f.dateStart, '12:00')),
      dateEnd: combineDateTime(endDate, timePart(f.dateEnd, '13:00')),
    }))
  }

  function updateDateSelectionMode(mode: DateSelectionMode) {
    setDateSelectionMode(mode)
    setForm(f => {
      const startDate = datePart(f.dateStart)
      const endDate = datePart(f.dateEnd)

      if (mode === 'single') {
        const startTime = timePart(f.dateStart, '12:00')
        const endTime = ensureEndTimeAfterStart(startTime, timePart(f.dateEnd, '13:00'))
        return {
          ...f,
          dateEnd: combineDateTime(startDate, endTime),
        }
      }

      return {
        ...f,
        dateEnd: startDate && startDate === endDate ? '' : f.dateEnd,
      }
    })
  }

  function updateDateTime(field: 'dateStart' | 'dateEnd', time: string, fallback: string) {
    setForm(f => ({
      ...f,
      [field]: combineDateTime(datePart(f[field]), time || fallback),
    }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.title || !form.dateStart || !form.dateEnd || !form.cityId || !form.location) {
      toast({ title: t('eventForm.requiredFieldsWarning', 'Заполните обязательные поля'), status: 'warning' })
      return
    }

    if (new Date(form.dateEnd) <= new Date(form.dateStart)) {
      toast({ title: t('eventForm.endAfterStartWarning', 'Окончание должно быть позже начала'), status: 'warning' })
      return
    }

    const maxGuests = form.isPublic && form.maxGuests.trim() ? parseInt(form.maxGuests) : undefined
    const payload = {
      title: form.title,
      description: form.description,
      date_start: new Date(form.dateStart).toISOString(),
      date_end: new Date(form.dateEnd).toISOString(),
      location: form.location,
      city_id: form.cityId,
      is_public: form.isPublic,
      ...(form.locationLat != null && form.locationLng != null
        ? { location_lat: form.locationLat, location_lng: form.locationLng }
        : {}),
      ...(form.dressCode.trim() ? { dress_code: form.dressCode.trim() } : {}),
      ...(maxGuests != null ? { max_guests: maxGuests } : {}),
    }

    if (isEdit && id) {
      updateEvent.mutate({
        ...payload,
        city_id: form.cityId === event?.city?.id ? undefined : form.cityId,
      }, {
        onSuccess: () => {
          toast({ title: t('eventForm.successUpdate', 'Сохранено'), status: 'success' })
          navigate(`/events/${id}`)
        },
        onError: err => toast({ title: t('eventForm.errorUpdate', 'Не удалось сохранить'), description: err.message, status: 'error' }),
      })
    } else {
      createEvent.mutate(payload, {
        onSuccess: (newEvent) => {
          toast({ title: t('eventForm.successCreate', 'Встреча создана'), status: 'success' })
          navigate(`/events/${newEvent.id}`)
        },
        onError: err => toast({ title: t('eventForm.errorCreate', 'Не удалось создать'), description: err.message, status: 'error' }),
      })
    }
  }

  const isLoading = createEvent.isPending || updateEvent.isPending

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5">
      <Button asChild variant="ghost" size="sm" className="self-start -ml-2 gap-1.5">
        <Link to={isEdit && id ? `/events/${id}` : '/events'}>
          <ArrowLeft size={14} /> {t('common.back', 'Назад')}
        </Link>
      </Button>

      <PageHeader
        title={isEdit ? t('eventForm.titleEdit', 'Редактировать встречу') : t('eventForm.titleCreate', 'Новая встреча')}
        subtitle={isEdit ? t('eventForm.subtitleEdit', 'Обновите детали встречи') : t('eventForm.subtitleCreate', 'Заполните поля — участников пригласите после создания.')}
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Section title={t('eventForm.sectionVisibility', 'Кто может присоединиться')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <RadioCard
              checked={!form.isPublic}
              onClick={() => setForm(f => ({ ...f, isPublic: false, maxGuests: '' }))}
              title={t('eventForm.typePersonal', 'Персональная')}
              description={t('eventForm.typePersonalDesc', 'Только приглашённые')}
            />
            <RadioCard
              checked={form.isPublic}
              onClick={() => update('isPublic', true)}
              title={t('eventForm.typePublic', 'Публичная')}
              description={t('eventForm.typePublicDesc', 'Любой может присоединиться')}
            />
          </div>
          {form.isPublic && (
            <Field
              label={t('eventForm.maxGuests', 'Максимум гостей')}
              optional
              className="max-w-[200px] mt-3"
            >
              <Input
                type="number"
                min={1}
                value={form.maxGuests}
                onChange={e => update('maxGuests', e.target.value)}
                placeholder={t('eventForm.maxGuestsPlaceholder', 'без лимита')}
              />
            </Field>
          )}
        </Section>

        <Section title={t('eventForm.sectionMainInfo', 'Основная информация')}>
          <Field label={t('eventForm.fieldTitle', 'Название')} required>
            <Input
              value={form.title}
              onChange={e => update('title', e.target.value)}
              placeholder={t('eventForm.fieldTitlePlaceholder', 'День рождения Ани · 28 лет')}
              required
            />
          </Field>
          <Field label={t('eventForm.fieldDescription', 'Описание')}>
            <Textarea
              value={form.description}
              onChange={e => update('description', e.target.value)}
              placeholder={t('eventForm.fieldDescriptionPlaceholder', 'Расскажите, чего ждать гостям...')}
              rows={4}
            />
          </Field>
        </Section>

        <Section title={t('eventForm.sectionWhenWhere', 'Когда и где')}>
          <Field label={t('eventForm.fieldDates', 'Даты')} required>
            <div className="flex flex-col gap-2.5">
              <SegmentedControl<DateSelectionMode>
                value={dateSelectionMode}
                onChange={updateDateSelectionMode}
                options={[
                  { value: 'single', label: t('eventForm.dateModeSingle', 'Один день') },
                  { value: 'range', label: t('eventForm.dateModeRange', 'Несколько дней') },
                ]}
                fullWidth
                selectionRole="radio"
                ariaLabel={t('eventForm.dateModeLabel', 'Продолжительность встречи')}
              />
              <DateRangePicker
                startDate={datePart(form.dateStart)}
                endDate={datePart(form.dateEnd)}
                onChange={({ startDate, endDate }) => updateDateRange(startDate, endDate)}
                placeholder={dateSelectionMode === 'single'
                  ? t('eventForm.singleDatePlaceholder', 'Выберите дату')
                  : t('eventForm.dateRangePlaceholder', 'Выберите период')}
                clearLabel={t('eventForm.dateRangeClear', 'Сбросить даты')}
                previousMonthLabel={t('eventForm.dateRangePreviousMonth', 'Предыдущий месяц')}
                nextMonthLabel={t('eventForm.dateRangeNextMonth', 'Следующий месяц')}
                locale={i18n.language === 'en' ? 'en-US' : 'ru-RU'}
                minDate={todayIsoDay()}
                selectionMode={dateSelectionMode}
                required
              />
            </div>
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('eventForm.fieldStartTime', 'Время начала')} required>
              <Input
                type="time"
                value={timePart(form.dateStart, '12:00')}
                onChange={e => updateDateTime('dateStart', e.target.value, '12:00')}
                disabled={!datePart(form.dateStart)}
                required
              />
            </Field>
            <Field label={t('eventForm.fieldEndTime', 'Время конца')} required>
              <Input
                type="time"
                value={timePart(form.dateEnd, '13:00')}
                onChange={e => updateDateTime('dateEnd', e.target.value, '13:00')}
                disabled={!datePart(form.dateEnd)}
                required
              />
            </Field>
          </div>
          <Field label={t('eventForm.fieldCity', 'Город')} required>
            <CitySelect
              value={form.cityId}
              onValueChange={cityId => update('cityId', cityId)}
              disabled={isLoading}
              currentCity={event?.city ?? undefined}
            />
          </Field>
          <Field label={t('eventForm.fieldLocation', 'Место')} required>
            <LocationPicker
              value={{ address: form.location, lat: form.locationLat, lng: form.locationLng }}
              onChange={v => setForm(f => ({ ...f, location: v.address, locationLat: v.lat, locationLng: v.lng }))}
              placeholder={t('eventForm.fieldLocationPlaceholder', 'Адрес или название места')}
            />
          </Field>
          <Field label={t('eventForm.fieldDressCode', 'Дресс-код')} optional>
            <Input
              value={form.dressCode}
              onChange={e => update('dressCode', e.target.value)}
              placeholder={t('eventForm.fieldDressCodePlaceholder', 'Smart casual, треккинг, Black tie...')}
            />
          </Field>
        </Section>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="soft" onClick={() => navigate(-1)}>
            {t('common.cancel', 'Отмена')}
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isEdit ? t('common.save', 'Сохранить') : t('common.create', 'Создать')}
          </Button>
        </div>
      </form>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-surface p-5 flex flex-col gap-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">{title}</div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}

function Field({
  label,
  required,
  optional,
  children,
  className,
}: {
  label: string
  required?: boolean
  optional?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col', className)}>
      <label className="text-[12px] font-semibold text-ink-2 mb-1.5 flex items-center gap-1.5">
        <span>{label}</span>
        {required && <span className="text-danger">*</span>}
        {optional && <span className="text-ink-3 font-medium">(необязательно)</span>}
      </label>
      {children}
    </div>
  )
}

function RadioCard({
  checked,
  onClick,
  title,
  description,
}: {
  checked: boolean
  onClick: () => void
  title: string
  description: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-left rounded-[var(--radius-control)] border p-3 transition focus-ring',
        checked
          ? 'border-accent bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)]'
          : 'border-line bg-surface hover:bg-hover',
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            'mt-0.5 inline-flex w-4 h-4 shrink-0 rounded-full border-2 transition items-center justify-center',
            checked ? 'border-accent' : 'border-line',
          )}
        >
          {checked && <span className="w-2 h-2 rounded-full bg-accent" />}
        </span>
        <div className="min-w-0">
          <div className={cn('text-[13.5px] font-semibold', checked ? 'text-accent' : 'text-ink')}>
            {title}
          </div>
          <div className="text-[12px] text-ink-3 mt-0.5">{description}</div>
        </div>
      </div>
    </button>
  )
}
