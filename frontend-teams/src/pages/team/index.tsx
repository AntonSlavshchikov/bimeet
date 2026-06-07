import { useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { useMembers, useInviteMember, useSetMemberActive } from '@/features/company-admin/hooks'
import { Button, Input, Spinner, Modal } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

export default function TeamPage() {
  const { user } = useAuth()
  const isOwner = user?.role === 'owner'
  const { data: members, isLoading } = useMembers(isOwner)
  const invite = useInviteMember()
  const setActive = useSetMemberActive()

  const [email, setEmail] = useState('')
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [error, setError] = useState('')

  function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    invite.mutate(email, {
      onSuccess: res => {
        setEmail('')
        setInviteLink(`${window.location.origin}/accept-invite?token=${res.token}`)
      },
      onError: err => setError(err instanceof Error ? err.message : 'Не удалось пригласить'),
    })
  }

  return (
    <div className="flex flex-col gap-5 max-w-[600px]">
      <h1 className="text-[22px] font-bold tracking-[-0.01em] text-ink">Команда</h1>

      <form onSubmit={handleInvite} className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <Input type="email" placeholder="email нового сотрудника" value={email} onChange={e => setEmail(e.target.value)} required />
          <Button type="submit" loading={invite.isPending}>Пригласить</Button>
        </div>
        {error && <p className="text-[13px] text-danger">{error}</p>}
      </form>

      {isLoading ? (
        <div className="py-16 flex justify-center"><Spinner className="w-7 h-7" /></div>
      ) : (
        <div className="rounded-[var(--radius-card)] border border-line bg-surface divide-y divide-line-soft">
          {members?.map(mem => {
            const self = mem.id === user?.id
            return (
              <div key={mem.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium text-ink truncate">{mem.name}</span>
                    <span className={cn('text-[11px] font-semibold px-1.5 py-0.5 rounded',
                      mem.role === 'owner' ? 'bg-accent/10 text-accent' : 'bg-bg-2 text-ink-3')}>
                      {mem.role === 'owner' ? 'Владелец' : 'Сотрудник'}
                    </span>
                    {!mem.is_active && <span className="text-[11px] font-semibold text-danger">отключён</span>}
                  </div>
                  <div className="text-[12.5px] text-ink-3 truncate">{mem.email}</div>
                </div>
                {!self && mem.role !== 'owner' && (
                  <Button variant="ghost" className="h-8"
                    loading={setActive.isPending}
                    onClick={() => setActive.mutate({ userId: mem.id, isActive: !mem.is_active })}>
                    {mem.is_active ? 'Отключить' : 'Включить'}
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={inviteLink !== null}
        title="Приглашение создано"
        onClose={() => setInviteLink(null)}
        footer={<Button onClick={() => { if (inviteLink) navigator.clipboard?.writeText(inviteLink); setInviteLink(null) }}>Скопировать и закрыть</Button>}
      >
        <p className="mb-2">Отправьте сотруднику ссылку для входа (в MVP письма не шлются):</p>
        <code className="block text-[12px] bg-bg-2 rounded p-2 break-all text-ink-2">{inviteLink}</code>
      </Modal>
    </div>
  )
}
