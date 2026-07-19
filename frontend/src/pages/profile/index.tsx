import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, Camera, Globe, Loader2, LogOut, Mail, MapPin, Moon, Sun, Trash2, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/features/auth/api'
import { useAuth } from '@/features/auth/model/AuthContext'
import { formatDate } from '@/shared/lib/formatDate'
import { useTheme, type Theme } from '@/shared/theme'
import { Avatar, Button, Input, SegmentedControl, useToast } from '@/shared/ui'
import PushSettings from '@/features/push/ui/PushSettings'
import { cn } from '@/shared/lib/cn'

type Tab = 'edit' | 'stats'

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth()
  const { t, i18n } = useTranslation()
  const isRu = i18n.language === 'ru'
  const [theme, setTheme] = useTheme()
  const toast = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<Tab>('edit')

  const { data: stats } = useQuery({
    queryKey: ['profile', 'stats'],
    queryFn: authApi.getStats,
  })

  const [form, setForm] = useState({
    name: user?.name ?? '',
    last_name: user?.last_name ?? '',
    city: user?.city ?? '',
    birth_date: user?.birth_date ? user.birth_date.slice(0, 10) : '',
  })

  const avatarMutation = useMutation({
    mutationFn: authApi.uploadAvatar,
    onSuccess: updated => {
      updateUser(updated)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast({ title: t('profile.avatarSaved', 'Аватар обновлён'), status: 'success' })
    },
    onError: () => toast({ title: t('profile.uploadError', 'Не удалось загрузить'), status: 'error' }),
  })

  const deleteAvatarMutation = useMutation({
    mutationFn: authApi.deleteAvatar,
    onSuccess: updated => {
      updateUser(updated)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast({ title: t('profile.avatarDeleted', 'Аватар удалён'), status: 'success' })
    },
    onError: () => toast({ title: t('profile.uploadError', 'Ошибка'), status: 'error' }),
  })

  const updateMutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: updated => {
      updateUser(updated)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setForm({
        name: updated.name,
        last_name: updated.last_name ?? '',
        city: updated.city ?? '',
        birth_date: updated.birth_date ? updated.birth_date.slice(0, 10) : '',
      })
      toast({ title: t('profile.saved', 'Сохранено'), status: 'success' })
    },
  })

  function handleSave() {
    updateMutation.mutate(form)
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const fullName = [user?.name, user?.last_name].filter(Boolean).join(' ')

  return (
    <div className="grid gap-5 items-start min-[1081px]:grid-cols-[280px_minmax(0,1fr)]">
      {/* Left: profile card */}
      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5 min-[1081px]:sticky min-[1081px]:top-5 flex flex-col items-center gap-4">
        {/* Avatar */}
        <div className="relative">
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className="group relative rounded-full focus-ring"
          >
            <Avatar size="xl" name={fullName || user?.name || '?'} src={user?.avatar_url} />
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
              {avatarMutation.isPending
                ? <Loader2 size={18} className="text-white animate-spin" />
                : <Camera size={18} className="text-white" />}
            </div>
          </button>
          {user?.avatar_url && (
            <button
              type="button"
              onClick={() => deleteAvatarMutation.mutate()}
              title={t('profile.deleteAvatar', 'Удалить аватар')}
              className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-danger hover:opacity-90 transition flex items-center justify-center"
            >
              {deleteAvatarMutation.isPending
                ? <Loader2 size={11} className="text-white animate-spin" />
                : <Trash2 size={11} className="text-white" />}
            </button>
          )}
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) avatarMutation.mutate(file)
              e.target.value = ''
            }}
          />
        </div>

        <div className="text-center">
          <div className="text-[16px] font-semibold tracking-[-0.015em] text-ink">{fullName || user?.name}</div>
          <div className="inline-flex items-center gap-1.5 mt-1 text-[12px] text-ink-3">
            <Mail size={11} />
            {user?.email}
          </div>
        </div>

        <div className="w-full border-t border-line-soft pt-4 flex flex-col gap-2.5">
          {user?.city && (
            <ProfileMeta icon={MapPin}>{user.city}</ProfileMeta>
          )}
          {user?.birth_date && (
            <ProfileMeta icon={Calendar}>{formatDate(user.birth_date)}</ProfileMeta>
          )}
          {user?.created_at && (
            <ProfileMeta icon={User}>
              <span className="text-ink-3">
                {t('profile.memberSince', 'С нами с')} {formatDate(user.created_at)}
              </span>
            </ProfileMeta>
          )}
        </div>
      </div>

      {/* Right: tabs */}
      <div className="rounded-[var(--radius-card)] border border-line bg-surface overflow-hidden">
        <div className="border-b border-line-soft px-3 py-3">
          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { value: 'edit', label: t('profile.editTab', 'Редактировать') },
              { value: 'stats', label: t('profile.statsTab', 'Статистика') },
            ]}
          />
        </div>

        <div className="p-4 sm:p-6">
          {tab === 'edit' && (
            <div className="flex flex-col gap-4">
              <Field label={t('auth.email', 'Email')}>
                <Input value={user?.email ?? ''} readOnly className="opacity-60 cursor-default" />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label={t('profile.firstName', 'Имя')}>
                  <Input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder={t('profile.firstName', 'Имя')}
                  />
                </Field>
                <Field label={t('profile.lastName', 'Фамилия')}>
                  <Input
                    value={form.last_name}
                    onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                    placeholder={t('profile.lastName', 'Фамилия')}
                  />
                </Field>
              </div>
              <Field label={t('profile.city', 'Город')}>
                <Input
                  value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  placeholder={t('profile.city', 'Город')}
                />
              </Field>
              <Field label={t('profile.birthDate', 'Дата рождения')}>
                <Input
                  type="date"
                  value={form.birth_date}
                  onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))}
                />
              </Field>
              <Button
                className="self-start"
                onClick={handleSave}
                disabled={updateMutation.isPending || !form.name.trim()}
              >
                {t('profile.save', 'Сохранить')}
              </Button>

              <div className="border-t border-line-soft pt-4">
                <Field label={t('profile.theme', 'Тема оформления')}>
                  <SegmentedControl<Theme>
                    fullWidth
                    value={theme}
                    onChange={setTheme}
                    options={[
                      { value: 'light', label: <span className="inline-flex items-center gap-1.5"><Sun size={13} />{t('profile.themeLight', 'Светлая')}</span> },
                      { value: 'dark', label: <span className="inline-flex items-center gap-1.5"><Moon size={13} />{t('profile.themeDark', 'Тёмная')}</span> },
                    ]}
                  />
                </Field>
              </div>

              <PushSettings />
            </div>
          )}

          {tab === 'stats' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatTile value={stats?.organized ?? 0} label={t('profile.statsOrganized', 'Организую')} />
              <StatTile value={stats?.participated ?? 0} label={t('profile.statsParticipated', 'Участвую')} />
              <StatTile value={stats?.completed ?? 0} label={t('profile.statsCompleted', 'Завершено')} />
              <StatTile value={stats?.upcoming ?? 0} label={t('profile.statsUpcoming', 'Впереди')} />
            </div>
          )}
        </div>
      </div>

      {/* Язык и выход — только в мобильной версии (на десктопе они в сайдбаре). */}
      <div className="min-[761px]:hidden flex flex-col gap-2">
        <button
          type="button"
          onClick={() => i18n.changeLanguage(isRu ? 'en' : 'ru')}
          className="w-full inline-flex items-center justify-center gap-2 rounded-[10px] border border-line px-3 py-2.5 text-[13px] font-semibold text-ink-2 hover:bg-hover transition focus-ring"
        >
          <Globe size={15} className="text-ink-3" />
          {isRu ? 'English' : 'Русский'}
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full inline-flex items-center justify-center gap-2 rounded-[10px] border border-line px-3 py-2.5 text-[13px] font-semibold text-danger hover:bg-hover transition focus-ring"
        >
          <LogOut size={15} />
          {t('common.logout', 'Выйти')}
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-ink-2 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function ProfileMeta({ icon: Icon, children }: { icon: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[13px] text-ink-2">
      <Icon size={13} className="text-ink-3 shrink-0" />
      <span className="min-w-0 truncate">{children}</span>
    </div>
  )
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div className={cn('rounded-[12px] bg-bg-2 p-4 flex flex-col items-center text-center gap-1')}>
      <div className="text-[32px] leading-none font-bold tracking-[-0.025em] text-accent tnum">{value}</div>
      <div className="text-[12px] text-ink-3 font-medium">{label}</div>
    </div>
  )
}
