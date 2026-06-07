import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useEvent } from '@/entities/event/queries'
import type { EventDetail } from '@/entities/event/types'
import { useCreateEvent, useUpdateEvent } from '@/features/event-manage/hooks'
import { toDatetimeLocal } from '@/shared/lib/date'
import { Button, Input, Textarea, Field, Spinner } from '@/shared/ui'

interface FormValues {
  title: string
  description: string
  dateStart: string
  dateEnd: string
  location: string
  meetingUrl: string
}

const empty: FormValues = {
  title: '',
  description: '',
  dateStart: '',
  dateEnd: '',
  location: '',
  meetingUrl: '',
}

function fromEvent(e: EventDetail): FormValues {
  return {
    title: e.title,
    description: e.description,
    dateStart: toDatetimeLocal(e.date_start),
    dateEnd: toDatetimeLocal(e.date_end),
    location: e.location,
    meetingUrl: e.meeting_url,
  }
}

// Wrapper resolves edit data first, so the inner form can initialise its state
// synchronously (no setState-in-effect).
export default function EventFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = Boolean(id)
  const { data: event, isLoading } = useEvent(id ?? '')

  if (isEdit && isLoading) {
    return <div className="py-20 flex justify-center"><Spinner className="w-7 h-7" /></div>
  }
  return <EventForm id={id} isEdit={isEdit} initial={event ? fromEvent(event) : empty} />
}

function EventForm({ id, isEdit, initial }: { id?: string; isEdit: boolean; initial: FormValues }) {
  const navigate = useNavigate()
  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent(id ?? '')

  const [form, setForm] = useState<FormValues>(initial)
  const [error, setError] = useState('')

  function update<K extends keyof FormValues>(key: K, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.title || !form.dateStart || !form.dateEnd) {
      setError('Заполните название и даты')
      return
    }
    if (!form.location && !form.meetingUrl) {
      setError('Укажите место или ссылку на встречу')
      return
    }
    const payload = {
      title: form.title,
      description: form.description,
      date_start: new Date(form.dateStart).toISOString(),
      date_end: new Date(form.dateEnd).toISOString(),
      location: form.location,
      meeting_url: form.meetingUrl,
    }
    try {
      if (isEdit && id) {
        await updateEvent.mutateAsync(payload)
        navigate(`/events/${id}`)
      } else {
        const created = await createEvent.mutateAsync(payload)
        navigate(`/events/${created.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить')
    }
  }

  const loading = createEvent.isPending || updateEvent.isPending

  return (
    <div className="flex flex-col gap-5 max-w-[560px]">
      <Button variant="ghost" asChild className="self-start -ml-2 h-9">
        <Link to={isEdit && id ? `/events/${id}` : '/'}>
          <ArrowLeft size={15} /> Назад
        </Link>
      </Button>

      <h1 className="text-[22px] font-bold tracking-[-0.01em] text-ink">
        {isEdit ? 'Редактировать встречу' : 'Новая встреча'}
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Название" required>
          <Input value={form.title} onChange={e => update('title', e.target.value)} required autoFocus />
        </Field>
        <Field label="Описание / повестка">
          <Textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Начало" required>
            <Input type="datetime-local" value={form.dateStart} onChange={e => update('dateStart', e.target.value)} required />
          </Field>
          <Field label="Конец" required>
            <Input type="datetime-local" value={form.dateEnd} onChange={e => update('dateEnd', e.target.value)} required />
          </Field>
        </div>
        <Field label="Место" hint="адрес офиса или переговорки">
          <Input value={form.location} onChange={e => update('location', e.target.value)} placeholder="Переговорка №3" />
        </Field>
        <Field label="Ссылка на встречу" hint="Zoom / Meet / Telegram">
          <Input value={form.meetingUrl} onChange={e => update('meetingUrl', e.target.value)} placeholder="https://meet…" />
        </Field>

        {error && <p className="text-[13px] text-danger font-medium">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            Отмена
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Сохранить' : 'Создать'}
          </Button>
        </div>
      </form>
    </div>
  )
}
