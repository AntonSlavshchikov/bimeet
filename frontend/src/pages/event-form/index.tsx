import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { useEvent } from '@/entities/event/queries'
import { useCreateEvent, useUpdateEvent } from '@/features/event-manage/model/hooks'
import type { EventCategory } from '@/entities/event/model/types'
import { Button, Input, Textarea, useToast } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

interface FormValues {
  title: string
  description: string
  dateStart: string
  dateEnd: string
  location: string
  category: EventCategory
  dressCode: string
  isPublic: boolean
  maxGuests: string
}

function toDatetimeLocal(iso: string) {
  if (!iso) return ''
  return iso.slice(0, 16)
}

export default function EventFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()
  const { t } = useTranslation()

  const event = useEvent(id ?? '')
  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent(id ?? '')

  const [form, setForm] = useState<FormValues>({
    title: '',
    description: '',
    dateStart: '',
    dateEnd: '',
    location: '',
    category: 'ordinary',
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
        category: event.category ?? 'ordinary',
        dressCode: event.dress_code ?? '',
        isPublic: event.is_public ?? false,
        maxGuests: event.max_guests != null ? String(event.max_guests) : '',
      })
    }
  }, [event])

  function update<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.title || !form.dateStart || !form.dateEnd || !form.location) {
      toast({ title: t('eventForm.requiredFieldsWarning', 'Заполните обязательные поля'), status: 'warning' })
      return
    }

    const maxGuests = form.isPublic && form.maxGuests.trim() ? parseInt(form.maxGuests) : undefined
    const payload = {
      title: form.title,
      description: form.description,
      date_start: new Date(form.dateStart).toISOString(),
      date_end: new Date(form.dateEnd).toISOString(),
      location: form.location,
      category: form.category,
      is_public: form.isPublic,
      ...(form.dressCode.trim() ? { dress_code: form.dressCode.trim() } : {}),
      ...(maxGuests != null ? { max_guests: maxGuests } : {}),
    }

    if (isEdit && id) {
      updateEvent.mutate(payload, {
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
    <div className="flex flex-col gap-5">
      <Button asChild variant="ghost" size="sm" className="self-start -ml-2">
        <Link to={isEdit && id ? `/events/${id}` : '/events'}>
          <ArrowLeft size={14} /> {t('common.back', 'Назад')}
        </Link>
      </Button>

      <div>
        <h1 className="text-[24px] font-bold tracking-[-0.02em] leading-[1.2] text-ink">
          {isEdit ? t('eventForm.titleEdit', 'Редактировать встречу') : t('eventForm.titleCreate', 'Новая встреча')}
        </h1>
        <p className="mt-1.5 text-[13.5px] text-ink-3">
          {isEdit ? t('eventForm.subtitleEdit', 'Обновите детали встречи') : t('eventForm.subtitleCreate', 'Заполните поля — участников пригласите после создания.')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Тип встречи */}
        <Section title={t('eventForm.sectionType', 'Тип встречи')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <RadioCard
              checked={form.category === 'ordinary'}
              onClick={() => update('category', 'ordinary')}
              title={t('eventForm.typeOrdinary', 'Личная')}
              description={t('eventForm.typeOrdinaryDesc', 'Праздник, ужин, поход')}
            />
            <RadioCard
              checked={form.category === 'business'}
              onClick={() => update('category', 'business')}
              title={t('eventForm.typeBusiness', 'Деловая')}
              description={t('eventForm.typeBusinessDesc', 'Совещание, созвон')}
            />
          </div>
        </Section>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('eventForm.fieldStart', 'Начало')} required>
              <Input
                type="datetime-local"
                value={form.dateStart}
                onChange={e => update('dateStart', e.target.value)}
                required
              />
            </Field>
            <Field label={t('eventForm.fieldEnd', 'Конец')} required>
              <Input
                type="datetime-local"
                value={form.dateEnd}
                onChange={e => update('dateEnd', e.target.value)}
                required
              />
            </Field>
          </div>
          <Field label={t('eventForm.fieldLocation', 'Место')} required>
            <Input
              value={form.location}
              onChange={e => update('location', e.target.value)}
              placeholder={
                form.category === 'business'
                  ? t('eventForm.fieldLocationPlaceholderBusiness', 'Zoom / адрес офиса')
                  : t('eventForm.fieldLocationPlaceholderOrdinary', 'Адрес или название места')
              }
              required
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

        {/* Submit bar */}
        <div className="sticky bottom-0 -mx-4 lg:-mx-8 px-4 lg:px-8 py-3 bg-bg/85 backdrop-blur-xl border-t border-line flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
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
    <section className="rounded-[14px] border border-line bg-surface p-5 flex flex-col gap-4">
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
        'text-left rounded-[10px] border p-3 transition focus-ring',
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
