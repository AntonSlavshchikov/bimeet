import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { useCompany } from '@/features/branding/CompanyProvider'
import { authApi } from '@/features/auth/api'
import { AuthShell } from '@/shared/ui/AuthShell'
import { Button, Input, Field } from '@/shared/ui'

export default function AcceptInvitePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const inviteToken = params.get('token') ?? ''
  const { setSession } = useAuth()
  const { company } = useCompany()

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await authApi.acceptInvite(inviteToken, name, password)
      setSession(res)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось принять приглашение')
      setLoading(false)
    }
  }

  if (!inviteToken) {
    return (
      <AuthShell brandName={company?.name} logoUrl={company?.logo_url} title="Приглашение недействительно"
        subtitle="Ссылка устарела или некорректна." />
    )
  }

  return (
    <AuthShell
      brandName={company?.name}
      logoUrl={company?.logo_url}
      title="Присоединиться к команде"
      subtitle="Придумайте пароль для входа"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Ваше имя" required>
          <Input value={name} onChange={e => setName(e.target.value)} required autoFocus />
        </Field>
        <Field label="Пароль" hint="минимум 8 символов" required>
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </Field>
        {error && <p className="text-[13px] text-danger font-medium">{error}</p>}
        <Button type="submit" loading={loading} className="w-full mt-1">
          Принять приглашение
        </Button>
      </form>
    </AuthShell>
  )
}
