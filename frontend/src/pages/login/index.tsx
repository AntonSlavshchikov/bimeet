import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/model/AuthContext'
import { authApi } from '@/features/auth/api'
import { apiFetch } from '@/shared/api/client'
import AuthShell, { AuthField } from '@/features/auth/ui/AuthShell'
import { Button, Input, OtpInput, useToast } from '@/shared/ui'

const RESEND_SECONDS = 60
const CODE_LENGTH = 6

export default function LoginPage() {
  const { verifyCode } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('token')

  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [codeError, setCodeError] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  // Resend cooldown countdown.
  useEffect(() => {
    if (resendIn <= 0) return
    const id = setInterval(() => setResendIn(s => s - 1), 1000)
    return () => clearInterval(id)
  }, [resendIn])

  async function continueAfterLogin() {
    if (inviteToken) {
      try {
        const participant = await apiFetch<{ event_id: string }>(`/api/events/invite/${inviteToken}`, {
          method: 'POST',
          body: JSON.stringify({ action: 'join' }),
        })
        navigate(`/events/${participant.event_id}`)
        return
      } catch {
        navigate('/events')
        return
      }
    }
    navigate('/events')
  }

  async function sendCode() {
    setLoading(true)
    try {
      await authApi.requestCode(email)
      setStep('code')
      setCode('')
      setCodeError(false)
      setResendIn(RESEND_SECONDS)
      toast({ title: t('auth.codeSent', 'Код отправлен на почту'), status: 'success' })
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : t('auth.loginError', 'Ошибка входа'),
        status: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  async function submitCode(value: string) {
    if (loading) return
    setLoading(true)
    const ok = await verifyCode(email, value)
    if (!ok) {
      setLoading(false)
      setCode('')
      setCodeError(true)
      return
    }
    await continueAfterLogin()
    setLoading(false)
  }

  function handleCodeChange(value: string) {
    if (codeError) setCodeError(false)
    setCode(value)
  }

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    void sendCode()
  }

  if (step === 'email') {
    return (
      <AuthShell
        title={t('auth.welcome', 'С возвращением')}
        subtitle={t('auth.enterEmail', 'Введите email — пришлём код для входа')}
      >
        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
          <AuthField label={t('auth.email', 'Email')}>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder', 'you@example.com')}
              required
              autoFocus
            />
          </AuthField>
          <Button type="submit" className="w-full mt-1" disabled={loading}>
            {loading ? '…' : t('auth.getCode', 'Получить код')}
          </Button>
        </form>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title={t('auth.enterCode', 'Введите код')}
      subtitle={t('auth.codeHint', { defaultValue: 'Мы отправили код на {{email}}', email })}
    >
      <div className="flex flex-col gap-4">
        <AuthField label={t('auth.code', 'Код')}>
          <OtpInput
            value={code}
            onChange={handleCodeChange}
            onComplete={submitCode}
            length={CODE_LENGTH}
            error={codeError}
            disabled={loading}
            autoFocus
          />
        </AuthField>

        {/* Status line: verifying spinner, then red error on a wrong code. */}
        <div className="flex items-center justify-center gap-2 h-5 text-[13px]" aria-live="polite">
          {loading ? (
            <span className="flex items-center gap-2 text-ink-3">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-ink-4 border-t-accent animate-spin" />
              {t('auth.verifying', 'Проверяем код…')}
            </span>
          ) : codeError ? (
            <span className="text-danger font-medium">{t('auth.invalidCode', 'Неверный или просроченный код')}</span>
          ) : null}
        </div>

        <div className="flex items-center justify-between text-[13px]">
          <button
            type="button"
            onClick={() => {
              setStep('email')
              setCode('')
              setCodeError(false)
            }}
            className="font-semibold text-accent hover:opacity-80"
          >
            {t('auth.changeEmail', 'Изменить email')}
          </button>
          <button
            type="button"
            disabled={resendIn > 0 || loading}
            onClick={() => void sendCode()}
            className="font-semibold text-accent hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resendIn > 0
              ? t('auth.resendIn', { defaultValue: 'Отправить повторно через {{count}}с', count: resendIn })
              : t('auth.resendCode', 'Отправить код повторно')}
          </button>
        </div>
      </div>
    </AuthShell>
  )
}
