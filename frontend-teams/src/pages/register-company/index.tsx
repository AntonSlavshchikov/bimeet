import { useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { authApi } from '@/features/auth/api'
import { workspaceUrl } from '@/shared/lib/subdomain'
import { AuthShell } from '@/shared/ui/AuthShell'
import { Button, Input, Field } from '@/shared/ui'

export default function RegisterCompanyPage() {
  const { setSession } = useAuth()

  const [form, setForm] = useState({
    companyName: '',
    subdomain: '',
    name: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
        subdomain: form.subdomain.toLowerCase().trim(),
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
        <Field label="Поддомен" hint={`${form.subdomain || 'acme'}.bimeet.pro`} required>
          <Input
            value={form.subdomain}
            onChange={e => update('subdomain', e.target.value)}
            placeholder="acme"
            required
          />
        </Field>
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
