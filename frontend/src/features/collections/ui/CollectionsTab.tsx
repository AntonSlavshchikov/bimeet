import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Check,
  ExternalLink,
  Plus,
  Trash2,
  Upload,
  Wallet,
} from 'lucide-react'
import type { Event } from '@/entities/event/model/types'
import {
  useAddCollection,
  useRemoveCollection,
  useSubmitContribution,
  useConfirmContribution,
  useRejectContribution,
  useMarkPaid,
} from '@/features/collections/model/hooks'
import {
  Avatar,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  StatusPill,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useToast,
} from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

interface ReceiptUploadDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (file: File) => void
  loading: boolean
}

function ReceiptUploadDialog({ open, onClose, onSubmit, loading }: ReceiptUploadDialogProps) {
  const { t } = useTranslation()
  const [file, setFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleClose() {
    setFile(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('collections.uploadReceiptTitle', 'Загрузите чек')}</DialogTitle>
          <DialogDescription>
            {t('collections.uploadReceiptHint', 'PDF или изображение. Организатор подтвердит платёж.')}
          </DialogDescription>
        </DialogHeader>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
        />
        <Button variant="outline" className="w-full" onClick={() => inputRef.current?.click()}>
          <Upload size={14} />
          {file ? file.name : t('collections.chooseFile', 'Выбрать файл')}
        </Button>
        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            {t('common.cancel', 'Отмена')}
          </Button>
          <Button
            disabled={!file || loading}
            onClick={() => file && onSubmit(file)}
          >
            {t('collections.uploadReceiptButton', 'Отправить')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function CollectionsTab({ event }: { event: Event }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null)

  const addCollection = useAddCollection(event.id)
  const removeCollection = useRemoveCollection(event.id)
  const submitContribution = useSubmitContribution(event.id)
  const confirmContribution = useConfirmContribution(event.id)
  const rejectContribution = useRejectContribution(event.id)
  const markPaid = useMarkPaid(event.id)

  const isOrganizer = event.organizer.is_me
  const isCompleted = event.status === 'completed'

  // The backend already emits one contribution row per expected member
  // (organizer + confirmed participants), so collection.contributions is the
  // authoritative payer list — no client-side matching by user id needed.
  const confirmedParticipants = event.participants.filter(p => p.status === 'confirmed')

  const totalTarget = event.collections.reduce((s, c) => s + c.per_person_amount * c.contributions.length, 0)
  const totalPaidCount = event.collections.flatMap(c => c.contributions).filter(c => c.status === 'paid').length
  const totalSlots = event.collections.reduce((s, c) => s + c.contributions.length, 0)
  const collectedPct = totalSlots > 0 ? Math.round((totalPaidCount / totalSlots) * 100) : 0
  const perPersonTotal = event.collections.reduce((s, c) => s + c.per_person_amount, 0)

  function handleAdd() {
    if (!newTitle.trim() || !newAmount) return
    addCollection.mutate(
      { title: newTitle.trim(), per_person_amount: Number(newAmount) },
      {
        onSuccess: () => { setNewTitle(''); setNewAmount(''); setOpen(false) },
        onError: err => toast({ title: t('common.error', 'Ошибка'), description: err.message, status: 'error' }),
      },
    )
  }

  function handleUploadReceipt(file: File) {
    if (!activeCollectionId) return
    submitContribution.mutate(
      { collectionId: activeCollectionId, file },
      { onSuccess: () => setActiveCollectionId(null) },
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <ReceiptUploadDialog
        open={activeCollectionId !== null}
        onClose={() => setActiveCollectionId(null)}
        onSubmit={handleUploadReceipt}
        loading={submitContribution.isPending}
      />

      {/* Stats */}
      {event.collections.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <StatTile color="purple" label={t('collections.totalLabel', 'Всего')} value={`${totalTarget.toLocaleString('ru-RU')} ₽`} />
          <StatTile
            color="blue"
            label={t('collections.perPersonLabel', 'С каждого')}
            value={`${perPersonTotal.toLocaleString('ru-RU')} ₽`}
            sub={t('collections.participantsCount', { count: confirmedParticipants.length, defaultValue: `${confirmedParticipants.length} участников` })}
          />
          <StatTile
            color="green"
            label={t('collections.contributedLabel', 'Собрано')}
            value={`${collectedPct}%`}
            sub={`${totalPaidCount}/${totalSlots}`}
          />
        </div>
      )}

      {/* Overall progress */}
      {totalSlots > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
              {t('collections.progressLabel', 'Прогресс')}
            </div>
            <div className="text-[12px] font-semibold text-accent tnum">{collectedPct}%</div>
          </div>
          <div className="h-1 w-full rounded-full bg-line-soft overflow-hidden">
            <div className="h-full bg-purple rounded-full transition-[width]" style={{ width: `${collectedPct}%` }} />
          </div>
        </div>
      )}

      {/* Section header + add */}
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
          {t('collections.sectionTitle', 'Сборы')}
        </div>
        {isOrganizer && !isCompleted && (
          <Button variant="outline" size="sm" onClick={() => setOpen(v => !v)}>
            <Plus size={13} /> {t('common.add', 'Добавить')}
          </Button>
        )}
      </div>

      {open && (
        <div className="rounded-[12px] border border-line bg-bg-2 p-3.5 flex flex-col gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3 mb-1.5">
              {t('collections.fieldTitle', 'Название')}
            </div>
            <Input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder={t('collections.fieldTitlePlaceholder', 'Торт, подарок, аренда...')}
              autoFocus
            />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3 mb-1.5">
              {t('collections.fieldAmount', 'С каждого, ₽')}
            </div>
            <Input
              type="number"
              min={1}
              value={newAmount}
              onChange={e => setNewAmount(e.target.value)}
              placeholder="0"
              className="max-w-[180px]"
            />
            {newAmount && confirmedParticipants.length > 0 && (
              <div className="mt-1.5 text-[12px] text-ink-3">
                {t('collections.perPersonHint', { amount: (Number(newAmount) * confirmedParticipants.length).toLocaleString('ru-RU'), defaultValue: `Итого: ${(Number(newAmount) * confirmedParticipants.length).toLocaleString('ru-RU')} ₽` })}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              {t('common.cancel', 'Отмена')}
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={addCollection.isPending}>
              {t('common.create', 'Создать')}
            </Button>
          </div>
        </div>
      )}

      {event.collections.length === 0 && (
        <div className="rounded-[12px] border border-line bg-surface py-12 px-4 flex flex-col items-center gap-2">
          <Wallet size={26} className="text-ink-3" />
          <p className="text-[13px] text-ink-3">{t('collections.empty', 'Сборов пока нет.')}</p>
        </div>
      )}

      {event.collections.map(collection => {
        const contributions = collection.contributions ?? []
        const paidCount = contributions.filter(c => c.status === 'paid').length
        const pendingContribs = contributions.filter(c => c.status === 'pending')
        const myContribution = contributions.find(c => c.user.is_me)
        const memberTotal = contributions.length
        const allPaid = paidCount === memberTotal && memberTotal > 0
        const shareAmount = collection.per_person_amount
        const pct = memberTotal > 0 ? Math.round((paidCount / memberTotal) * 100) : 0

        return (
          <div
            key={collection.id}
            className={cn(
              'rounded-[12px] border bg-surface p-4 transition',
              allPaid ? 'border-success/40' : 'border-line',
            )}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium text-ink truncate">{collection.title}</div>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="text-[12px] text-ink-3">
                    {t('collections.totalAmount', { amount: (collection.per_person_amount * memberTotal).toLocaleString('ru-RU'), defaultValue: `Всего ${(collection.per_person_amount * memberTotal).toLocaleString('ru-RU')} ₽` })}
                  </span>
                  <span className="text-ink-4">·</span>
                  <span className="text-[12px] font-semibold text-accent">
                    {t('collections.perYou', { amount: shareAmount.toLocaleString('ru-RU'), defaultValue: `С вас ${shareAmount.toLocaleString('ru-RU')} ₽` })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className={cn(
                    'px-2 py-0.5 rounded-[6px] text-[11.5px] font-semibold tnum',
                    allPaid ? 'bg-success/12 text-success' : 'bg-warning/12 text-warning',
                  )}
                >
                  {paidCount}/{memberTotal}
                </div>
                {isOrganizer && !isCompleted && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label={t('collections.deleteButton', 'Удалить')}
                        disabled={paidCount > 0}
                        onClick={() => removeCollection.mutate(collection.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[7px] text-ink-3 hover:bg-danger/10 hover:text-danger transition disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <Trash2 size={14} />
                      </button>
                    </TooltipTrigger>
                    {paidCount > 0 && (
                      <TooltipContent>{t('collections.deleteTooltip', 'Нельзя удалить — уже есть оплаты')}</TooltipContent>
                    )}
                  </Tooltip>
                )}
              </div>
            </div>

            {/* Progress */}
            <div className="h-1 w-full rounded-full bg-line-soft overflow-hidden my-3">
              <div
                className={cn('h-full rounded-full transition-[width]', allPaid ? 'bg-success' : 'bg-purple')}
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Avatars row with status indicators */}
            {contributions.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mb-3">
                {contributions.map(contrib => {
                  const status = contrib.status
                  return (
                    <Tooltip key={contrib.user.email}>
                      <TooltipTrigger asChild>
                        <div className={cn('relative', status === 'not_paid' && 'opacity-50')}>
                          <Avatar name={contrib.user.name} size="sm" />
                          {status === 'paid' && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-surface" />
                          )}
                          {status === 'pending' && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-warning border-2 border-surface" />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {status === 'paid'
                          ? t('collections.tooltipPaid', { name: contrib.user.name, defaultValue: `${contrib.user.name} — оплачено` })
                          : status === 'pending'
                            ? t('collections.tooltipPending', { name: contrib.user.name, defaultValue: `${contrib.user.name} — на проверке` })
                            : t('collections.tooltipNotPaid', { name: contrib.user.name, defaultValue: `${contrib.user.name} — не оплачено` })}
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            )}

            {/* Participant action */}
            {contributions.some(c => c.user.is_me) && !isCompleted && (
              <div>
                {isOrganizer && (!myContribution || myContribution.status === 'not_paid') && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => markPaid.mutate({ collectionId: collection.id })}
                    disabled={markPaid.isPending}
                  >
                    <Check size={14} /> {t('collections.buttonContribute', 'Я заплатил(а)')}
                  </Button>
                )}
                {!isOrganizer && (!myContribution || myContribution.status === 'not_paid') && (
                  <Button variant="outline" className="w-full" onClick={() => setActiveCollectionId(collection.id)}>
                    <Upload size={14} /> {t('collections.buttonContribute', 'Я заплатил(а)')}
                  </Button>
                )}
                {myContribution?.status === 'pending' && (
                  <StatusPill variant="invited">{t('collections.statusPending', 'На проверке')}</StatusPill>
                )}
                {myContribution?.status === 'paid' && (
                  <StatusPill variant="going">{t('collections.statusPaid', 'Оплачено')}</StatusPill>
                )}
              </div>
            )}

            {/* Organizer: pending section */}
            {isOrganizer && !isCompleted && pendingContribs.length > 0 && (
              <div className="mt-3 rounded-[10px] border border-warning/30 bg-warning/5 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-warning mb-2">
                  {t('collections.pendingSection', 'На проверке')} ({pendingContribs.length})
                </div>
                <div className="flex flex-col gap-2">
                  {pendingContribs.map(contrib => {
                    return (
                      <div key={contrib.id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Avatar name={contrib.user.name} size="xs" />
                          <span className="text-[12.5px] font-medium text-ink truncate">{contrib.user.name}</span>
                          {contrib.receipt_url && (
                            <a
                              href={contrib.receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[12px] text-accent hover:opacity-80"
                            >
                              <ExternalLink size={10} /> {t('collections.viewReceipt', 'чек')}
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            onClick={() => contrib.id && confirmContribution.mutate({ collectionId: collection.id, contribId: contrib.id })}
                            disabled={confirmContribution.isPending}
                          >
                            {t('collections.confirm', 'OK')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => contrib.id && rejectContribution.mutate({ collectionId: collection.id, contribId: contrib.id })}
                            disabled={rejectContribution.isPending}
                          >
                            {t('collections.reject', 'Откл.')}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function StatTile({
  color,
  label,
  value,
  sub,
}: {
  color: 'purple' | 'blue' | 'green'
  label: string
  value: string
  sub?: string
}) {
  return (
    <div
      className={cn(
        'rounded-[10px] border border-line bg-bg-2 px-3.5 py-3 border-l-[3px]',
        color === 'purple' && 'border-l-purple',
        color === 'blue' && 'border-l-accent',
        color === 'green' && 'border-l-success',
      )}
    >
      <div className="text-[11px] text-ink-3 font-medium">{label}</div>
      <div className="text-[17px] font-bold text-ink tracking-[-0.02em] mt-0.5 tnum truncate">{value}</div>
      {sub && <div className="text-[11px] text-ink-3 mt-0.5 tnum">{sub}</div>}
    </div>
  )
}
