import { useState } from 'react'
import { Globe } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { authApi } from '@/features/auth/api'
import { workspaceUrl } from '@/shared/lib/subdomain'
import { slugify } from '@/shared/lib/slugify'
import { AuthShell } from '@/shared/ui/AuthShell'
import { Button, Input, Field } from '@/shared/ui'

export default function RegisterCompanyPage() {
  const { setSession } = useAuth()

  const [form, setForm] = useState({
    companyName: '',
    name: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Live preview of the auto-generated address. The backend decides the final
  // value (and may add a -2 suffix on collision), so this is informational.
  const previewSubdomain = slugify(form.companyName) || 'company'

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await authApi.registerCompany({
        email: form.email,
        password: form.password,
        name: form.name,
        company_name: form.companyName,
      })
      setSession(res)
      // The workspace lives on its own origin — hand the token over via the URL
      // hash and redirect there.
      window.location.href = `${workspaceUrl(res.company.subdomain)}/#token=${encodeURIComponent(res.token)}`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось зарегистрировать компанию')
      setLoading(false)
    }
  }

  return (
    <AuthShell
      brandName="Bimeet for Teams"
      title="Регистрация компании"
      subtitle="Создайте рабочее пространство для своей команды"
      footer="После регистрации вы попадёте на адрес своей компании."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Название компании" required>
          <Input value={form.companyName} onChange={e => update('companyName', e.target.value)} required autoFocus />
        </Field>

        {/* Address preview — generated from the company name, shown prominently. */}
        <div className="rounded-[var(--radius-control)] border border-accent/30 bg-accent/[0.06] px-3.5 py-3 flex items-center gap-3">
          <Globe size={18} className="text-accent shrink-0" />
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">
              Адрес рабочего пространства
            </div>
            <div className="text-[15px] font-bold truncate">
              <span className="text-accent">{previewSubdomain}</span>
              <span className="text-ink-3 font-semibold">.bimeet.pro</span>
            </div>
          </div>
        </div>
        <p className="-mt-2 text-[12px] text-ink-3">
          Создаётся автоматически из названия. Если адрес занят, добавим номер (например {previewSubdomain}-2).
        </p>
        <Field label="Ваше имя" required>
          <Input value={form.name} onChange={e => update('name', e.target.value)} required />
        </Field>
        <Field label="Email" required>
          <Input type="email" value={form.email} onChange={e => update('email', e.target.value)} required />
        </Field>
        <Field label="Пароль" hint="минимум 8 символов" required>
          <Input type="password" value={form.password} onChange={e => update('password', e.target.value)} required />
        </Field>
        {error && <p className="text-[13px] text-danger font-medium">{error}</p>}
        <Button type="submit" loading={loading} className="w-full mt-1">
          Создать компанию
        </Button>
      </form>
    </AuthShell>
  )
}
