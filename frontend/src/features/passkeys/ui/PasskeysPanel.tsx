import { useEffect, useState } from 'react'
import { KeyRound, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Passkey } from '@/features/passkeys/api'
import { cancelPasskeyCeremony, isPasskeyCancellation, supportsPasskeys } from '@/features/passkeys/lib/webauthn'
import {
  useCreatePasskey,
  useDeletePasskey,
  usePasskeyConfig,
  usePasskeys,
  useRenamePasskey,
} from '@/features/passkeys/model/hooks'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  useToast,
} from '@/shared/ui'

type DialogState = { kind: 'create' } | { kind: 'rename' | 'delete'; passkey: Passkey } | null

export default function PasskeysPanel() {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const supported = supportsPasskeys()
  const { data: config } = usePasskeyConfig()
  const enabled = supported && config?.enabled === true
  const { data: passkeys = [], isPending, isError } = usePasskeys(enabled)
  const createPasskey = useCreatePasskey()
  const renamePasskey = useRenamePasskey()
  const deletePasskey = useDeletePasskey()
  const [dialog, setDialog] = useState<DialogState>(null)
  const [name, setName] = useState('')
  const busy = createPasskey.isPending || renamePasskey.isPending || deletePasskey.isPending

  useEffect(() => cancelPasskeyCeremony, [])

  if (!enabled) return null

  function openDialog(next: Exclude<DialogState, null>) {
    setDialog(next)
    setName(next.kind === 'rename' ? next.passkey.name : '')
  }

  function closeDialog() {
    cancelPasskeyCeremony()
    setDialog(null)
  }

  async function submitDialog() {
    try {
      if (dialog?.kind === 'create') {
        await createPasskey.mutateAsync(name.trim() || undefined)
        toast({ title: t('profile.passkeyCreated'), status: 'success' })
      } else if (dialog?.kind === 'rename') {
        await renamePasskey.mutateAsync({ id: dialog.passkey.id, name: name.trim() })
        toast({ title: t('profile.passkeyRenamed'), status: 'success' })
      } else if (dialog?.kind === 'delete') {
        await deletePasskey.mutateAsync(dialog.passkey.id)
        toast({ title: t('profile.passkeyDeleted'), status: 'success' })
      }
      setDialog(null)
    } catch (error) {
      if (!isPasskeyCancellation(error)) {
        toast({
          title: t('profile.passkeyError'),
          description: error instanceof Error ? error.message : undefined,
          status: 'error',
        })
      }
    }
  }

  function formatTimestamp(value: string) {
    return new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  }

  return (
    <>
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">{t('profile.passkeysTitle')}</h2>
            <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-ink-3">
              {t('profile.passkeysDescription')}
            </p>
          </div>
          <Button
            size="sm"
            disabled={passkeys.length >= 10 || isPending}
            onClick={() => openDialog({ kind: 'create' })}
          >
            <Plus size={14} />
            {t('profile.addPasskey')}
          </Button>
        </div>

        {isPending ? (
          <div className="flex min-h-28 items-center justify-center text-ink-3">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : isError ? (
          <p className="py-6 text-center text-[13px] text-danger">{t('profile.passkeysLoadError')}</p>
        ) : passkeys.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-[14px] border border-dashed border-line p-7 text-center">
            <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-bg-2 text-ink-3">
              <KeyRound size={18} />
            </span>
            <p className="text-[13px] font-semibold text-ink">{t('profile.noPasskeys')}</p>
            <p className="max-w-sm text-[12px] text-ink-3">{t('profile.noPasskeysHint')}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[14px] border border-line">
            {passkeys.map((passkey, index) => (
              <div
                key={passkey.id}
                className={`flex items-center gap-3 p-4 ${index > 0 ? 'border-t border-line-soft' : ''}`}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-bg-2 text-ink-2">
                  <KeyRound size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink">{passkey.name}</p>
                  <p className="mt-0.5 text-[11px] text-ink-3">
                    {passkey.last_used_at
                      ? t('profile.passkeyLastUsed', { date: formatTimestamp(passkey.last_used_at) })
                      : t('profile.passkeyCreatedAt', { date: formatTimestamp(passkey.created_at) })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('profile.renamePasskey')}
                  onClick={() => openDialog({ kind: 'rename', passkey })}
                >
                  <Pencil size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-danger"
                  aria-label={t('profile.deletePasskey')}
                  onClick={() => openDialog({ kind: 'delete', passkey })}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}
        {passkeys.length >= 10 && <p className="text-[12px] text-warning">{t('profile.passkeyLimit')}</p>}
      </section>

      <Dialog open={dialog != null} onOpenChange={open => { if (!open) closeDialog() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.kind === 'create'
                ? t('profile.addPasskeyTitle')
                : dialog?.kind === 'rename'
                  ? t('profile.renamePasskeyTitle')
                  : t('profile.deletePasskeyTitle')}
            </DialogTitle>
            <DialogDescription>
              {dialog?.kind === 'delete' ? t('profile.deletePasskeyDescription') : t('profile.passkeyNameHint')}
            </DialogDescription>
          </DialogHeader>
          {dialog?.kind !== 'delete' && (
            <Input
              value={name}
              maxLength={64}
              autoFocus
              placeholder={t('profile.passkeyNamePlaceholder')}
              onChange={event => setName(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && (dialog?.kind === 'create' || name.trim())) void submitDialog()
              }}
            />
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog} disabled={busy}>{t('common.cancel')}</Button>
            <Button
              variant={dialog?.kind === 'delete' ? 'danger' : 'primary'}
              disabled={busy || (dialog?.kind === 'rename' && !name.trim())}
              onClick={() => void submitDialog()}
            >
              {busy && <Loader2 size={13} className="animate-spin" />}
              {dialog?.kind === 'delete' ? t('common.delete') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
