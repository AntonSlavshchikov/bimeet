import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authApi } from '@/features/auth/api'
import AuthShell, { AuthField } from '@/features/auth/ui/AuthShell'
import { Button, Input, useToast } from '@/shared/ui'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) {
      toast({ title: t('auth.missingResetToken', 'Ссылка недействительна'), status: 'error' })
      return
    }
    if (!password || !confirm) {
      toast({ title: t('auth.fillAllFields', 'Заполните все поля'), status: 'warning' })
      return
    }
    if (password !== confirm) {
      toast({ title: t('auth.passwordsDoNotMatch', 'Пароли не совпадают'), status: 'error' })
      return
    }
    setLoading(true)
    try {
      await authApi.resetPassword(token, password)
      toast({ title: t('auth.resetPasswordSuccess', 'Пароль обновлён'), status: 'success' })
      navigate('/login')
    } catch {
      toast({ title: t('auth.resetPasswordError', 'Не удалось сбросить пароль'), status: 'error' })
    }
    setLoading(false)
  }

  return (
    <AuthShell
      title={t('auth.resetPasswordTitle', 'Новый пароль')}
      subtitle={t('auth.resetPasswordSubtitle', 'Придумайте пароль для входа в аккаунт.')}
      footer={
        <Link to="/login" className="font-semibold text-accent hover:opacity-80">
          {t('auth.backToLogin', 'Вернуться к входу')}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AuthField label={t('auth.newPassword', 'Новый пароль')}>
          <Input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={t('auth.passwordPlaceholder', 'минимум 6 символов')}
            required
          />
        </AuthField>
        <AuthField label={t('auth.confirmPassword', 'Повторите пароль')}>
          <Input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder={t('auth.passwordPlaceholder', 'минимум 6 символов')}
            required
          />
        </AuthField>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? '…' : t('auth.resetPassword', 'Сохранить пароль')}
        </Button>
      </form>
    </AuthShell>
  )
}
