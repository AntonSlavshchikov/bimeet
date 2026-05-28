import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/model/AuthContext'
import { apiFetch } from '@/shared/api/client'
import AuthShell, { AuthField } from '@/features/auth/ui/AuthShell'
import { Button, Input, useToast } from '@/shared/ui'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('token')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !email || !password) {
      toast({ title: t('auth.fillAllFields', 'Заполните все поля'), status: 'warning' })
      return
    }
    setLoading(true)
    const ok = await register(name, email, password)
    if (!ok) {
      setLoading(false)
      toast({ title: t('auth.registerError', 'Не удалось зарегистрироваться'), status: 'error' })
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
      title={t('auth.createAccount', 'Новый аккаунт')}
      subtitle={t('auth.createAccountSubtitle', 'Начните организовывать встречи без хаоса')}
      footer={
        <>
          {t('auth.alreadyHaveAccount', 'Уже есть аккаунт?')}{' '}
          <Link
            to={inviteToken ? `/login?token=${inviteToken}` : '/login'}
            className="font-semibold text-accent hover:opacity-80"
          >
            {t('auth.signIn', 'Войти')}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AuthField label={t('auth.name', 'Имя')}>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('auth.namePlaceholder', 'Анна')}
            required
          />
        </AuthField>
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
            placeholder={t('auth.passwordPlaceholder', 'минимум 6 символов')}
            required
          />
        </AuthField>

        <Button type="submit" className="w-full mt-1" disabled={loading}>
          {loading ? '…' : t('auth.signUp', 'Зарегистрироваться')}
        </Button>
      </form>
    </AuthShell>
  )
}
