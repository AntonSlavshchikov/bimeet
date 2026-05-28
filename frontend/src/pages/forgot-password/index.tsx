import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authApi } from '@/features/auth/api'
import AuthShell, { AuthField } from '@/features/auth/ui/AuthShell'
import { Button, Input } from '@/shared/ui'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
    } catch {
      // Always show "sent" — don't leak whether email exists
    }
    setLoading(false)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <AuthShell
        title={t('auth.resetEmailSent', 'Письмо отправлено')}
        subtitle={t('auth.resetEmailSentDescription', 'Если такой email существует, мы отправили ссылку для сброса. Проверьте почту.')}
      >
        <Button asChild className="w-full">
          <Link to="/login">{t('auth.backToLogin', 'Вернуться к входу')}</Link>
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title={t('auth.forgotPasswordTitle', 'Восстановить пароль')}
      subtitle={t('auth.forgotPasswordSubtitle', 'Введите email — пришлём ссылку для сброса.')}
      footer={
        <Link to="/login" className="font-semibold text-accent hover:opacity-80">
          {t('auth.backToLogin', 'Вернуться к входу')}
        </Link>
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
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? '…' : t('auth.sendResetLink', 'Отправить ссылку')}
        </Button>
      </form>
    </AuthShell>
  )
}
