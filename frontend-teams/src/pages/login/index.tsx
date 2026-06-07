import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { useCompany } from '@/features/branding/CompanyProvider'
import { authApi } from '@/features/auth/api'
import { AuthShell } from '@/shared/ui/AuthShell'
import { Button, Input, Field } from '@/shared/ui'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setSession } = useAuth()
  const { subdomain, company } = useCompany()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subdomain) return
    setLoading(true)
    setError('')
    try {
      const res = await authApi.login(subdomain, email, password)
      setSession(res)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти')
      setLoading(false)
    }
  }

  return (
    <AuthShell
      brandName={company?.name}
      logoUrl={company?.logo_url}
      title="Вход"
      subtitle="Войдите в рабочее пространство компании"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Email" required>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
        </Field>
        <Field label="Пароль" required>
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </Field>
        {error && <p className="text-[13px] text-danger font-medium">{error}</p>}
        <Button type="submit" loading={loading} className="w-full mt-1">
          Войти
        </Button>
      </form>
    </AuthShell>
  )
}
