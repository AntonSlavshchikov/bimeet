import { useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { useUpdateCompany } from '@/features/company-admin/hooks'
import { Button, Input, Field } from '@/shared/ui'

export default function SettingsPage() {
  const { company, updateCompany } = useAuth()
  const update = useUpdateCompany()

  const [name, setName] = useState(company?.name ?? '')
  const [brandColor, setBrandColor] = useState(company?.brand_color ?? '#4F46E5')
  const [logoUrl, setLogoUrl] = useState(company?.logo_url ?? '')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaved(false)
    try {
      const updated = await update.mutateAsync({
        name,
        brand_color: brandColor,
        logo_url: logoUrl,
      })
      updateCompany(updated)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить')
    }
  }

  return (
    <div className="flex flex-col gap-5 max-w-[520px]">
      <h1 className="text-[22px] font-bold tracking-[-0.01em] text-ink">Настройки компании</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Название компании" required>
          <Input value={name} onChange={e => setName(e.target.value)} required />
        </Field>

        <Field label="Цвет бренда" hint="влияет на кнопки и акценты во всём пространстве">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={brandColor}
              onChange={e => setBrandColor(e.target.value)}
              className="h-10 w-12 rounded-[var(--radius-control)] border border-line bg-surface p-1 cursor-pointer"
            />
            <Input value={brandColor} onChange={e => setBrandColor(e.target.value)} className="max-w-[140px]" />
            <span
              className="ml-auto inline-flex items-center justify-center h-9 px-4 rounded-[var(--radius-control)] text-white text-[13px] font-semibold"
              style={{ backgroundColor: brandColor }}
            >
              Пример
            </span>
          </div>
        </Field>

        <Field label="URL логотипа" hint="ссылка на изображение (опционально)">
          <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://…/logo.svg" />
        </Field>

        {error && <p className="text-[13px] text-danger font-medium">{error}</p>}
        {saved && <p className="text-[13px] text-success font-medium">Сохранено</p>}

        <div className="flex justify-end">
          <Button type="submit" loading={update.isPending}>Сохранить</Button>
        </div>
      </form>
    </div>
  )
}
