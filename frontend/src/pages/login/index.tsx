import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/model/AuthContext'
import { apiFetch } from '@/shared/api/client'
import AuthShell, { AuthField } from '@/features/auth/ui/AuthShell'
import { Button, Input, useToast } from '@/shared/ui'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('token')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const ok = await login(email, password)
    if (!ok) {
      setLoading(false)
      toast({ title: t('auth.loginError', 'Неверный email или пароль'), status: 'error' })
      return
    }
    if (inviteToken) {
      try {
        const participant = await apiFetch<{ event_id: string }>(`/api/events/invite/${inviteToken}`, {
          method: 'POST',
          body: JSON.stringify({ action: 'join' }),
        })
        navigate(`/events/${participant.event_id}`)
      } catch {
        navigate('/events')
      }
    } else {
      navigate('/events')
    }
    setLoading(false)
  }

  return (
    <AuthShell
      title={t('auth.welcome', 'С возвращением')}
      subtitle={t('auth.signInSubtitle', 'Войдите в свой аккаунт')}
      footer={
        <>
          {t('auth.noAccount', 'Нет аккаунта?')}{' '}
          <Link
            to={inviteToken ? `/register?token=${inviteToken}` : '/register'}
            className="font-semibold text-accent hover:opacity-80"
          >
            {t('auth.signUp', 'Регистрация')}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AuthField label={t('auth.email', 'Email')}>
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={t('auth.emailPlaceholder', 'you@example.com')}
            required
          />
        </AuthField>
        <AuthField label={t('auth.password', 'Пароль')}>
          <Input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={t('auth.passwordPlaceholder', '••••••••')}
            required
          />
        </AuthField>

        <Button type="submit" className="w-full mt-1" disabled={loading}>
          {loading ? '…' : t('auth.signIn', 'Войти')}
        </Button>

        <div className="text-center text-[13px]">
          <Link to="/forgot-password" className="font-semibold text-accent hover:opacity-80">
            {t('auth.forgotPassword', 'Забыли пароль?')}
          </Link>
        </div>
      </form>
    </AuthShell>
  )
}
