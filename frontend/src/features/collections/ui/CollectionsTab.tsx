import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ExternalLink, Plus, Trash2, Upload, Wallet } from 'lucide-react'
import type { Event } from '@/entities/event/model/types'
import {
  useAddCollection,
  useConfirmContribution,
  useMarkPaid,
  useRejectContribution,
  useRemoveCollection,
  useSubmitContribution,
} from '@/features/collections/model/hooks'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EventSectionDataRow,
  EventSectionEmpty,
  EventSectionHeader,
  EventSectionList,
  EventSectionProgress,
  EventSectionStat,
  EventSectionStats,
  Input,
  useToast,
} from '@/shared/ui'

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
    <Dialog open={open} onOpenChange={value => !value && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('collections.uploadReceiptTitle')}</DialogTitle>
          <DialogDescription>{t('collections.uploadReceiptHint')}</DialogDescription>
        </DialogHeader>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={event => setFile(event.target.files?.[0] ?? null)}
        />
        <Button variant="outline" className="w-full" onClick={() => inputRef.current?.click()}>
          <Upload size={14} />
          {file ? file.name : t('collections.chooseFile')}
        </Button>
        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>{t('common.cancel')}</Button>
          <Button disabled={!file || loading} onClick={() => file && onSubmit(file)}>
            {t('collections.uploadReceiptButton')}
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
  const confirmedParticipants = event.participants.filter(participant => participant.status === 'confirmed')
  const contributionRows = event.collections.flatMap(collection =>
    (collection.contributions ?? []).map(contribution => ({ collection, contribution })),
  )
  const totalTarget = event.collections.reduce(
    (sum, collection) => sum + collection.per_person_amount * collection.contributions.length,
    0,
  )
  const totalCollected = contributionRows.reduce(
    (sum, row) => sum + (row.contribution.status === 'paid' ? row.collection.per_person_amount : 0),
    0,
  )
  const perPersonTotal = event.collections.reduce((sum, collection) => sum + collection.per_person_amount, 0)
  const collectedPct = totalTarget > 0 ? Math.round((totalCollected / totalTarget) * 100) : 0
  const remaining = Math.max(0, totalTarget - totalCollected)

  function handleAdd() {
    if (!newTitle.trim() || !newAmount) return
    addCollection.mutate(
      { title: newTitle.trim(), per_person_amount: Number(newAmount) },
      {
        onSuccess: () => {
          setNewTitle('')
          setNewAmount('')
          setOpen(false)
        },
        onError: error => toast({ title: t('common.error'), description: error.message, status: 'error' }),
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
    <div>
      <ReceiptUploadDialog
        open={activeCollectionId !== null}
        onClose={() => setActiveCollectionId(null)}
        onSubmit={handleUploadReceipt}
        loading={submitContribution.isPending}
      />

      <EventSectionHeader
        kicker={t('collections.kicker')}
        title={t('collections.sectionTitle')}
        description={t('collections.description')}
        action={isOrganizer && !isCompleted ? (
          <Button size="md" onClick={() => setOpen(value => !value)}>
            <Plus size={14} /> {t('collections.newCollection')}
          </Button>
        ) : undefined}
      />

      {open && (
        <div className="mt-[18px] flex flex-col gap-3 rounded-[15px] border border-line bg-bg-2/55 p-3.5">
          <div>
            <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-ink-3">
              {t('collections.fieldTitle')}
            </div>
            <Input
              value={newTitle}
              onChange={inputEvent => setNewTitle(inputEvent.target.value)}
              placeholder={t('collections.fieldTitlePlaceholder')}
              autoFocus
            />
          </div>
          <div>
            <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-ink-3">
              {t('collections.fieldAmount')}
            </div>
            <Input
              type="number"
              min={1}
              value={newAmount}
              onChange={inputEvent => setNewAmount(inputEvent.target.value)}
              placeholder="0"
              className="max-w-[180px]"
            />
            {newAmount && confirmedParticipants.length > 0 && (
              <div className="mt-1.5 text-[12px] text-ink-3">
                {t('collections.perPersonHint', {
                  amount: (Number(newAmount) * confirmedParticipants.length).toLocaleString('ru-RU'),
                })}
              </div>
            )}
          </div>
          {event.collections.length > 0 && (
            <div className="border-t border-line pt-2">
              {event.collections.map(collection => {
                const hasPaid = collection.contributions.some(contribution => contribution.status !== 'not_paid')
                return (
                  <div key={collection.id} className="flex min-h-9 items-center justify-between gap-3 border-b border-line py-1 last:border-0">
                    <span className="truncate text-[10px] font-bold text-ink">{collection.title}</span>
                    <button
                      type="button"
                      aria-label={t('collections.deleteButton')}
                      disabled={hasPaid || removeCollection.isPending}
                      onClick={() => removeCollection.mutate(collection.id)}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-ink-3 transition hover:bg-danger/10 hover:text-danger disabled:pointer-events-none disabled:opacity-35"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button size="sm" onClick={handleAdd} disabled={addCollection.isPending}>{t('common.create')}</Button>
          </div>
        </div>
      )}

      <EventSectionStats>
        <EventSectionStat label={t('collections.statTarget')} value={`${totalTarget.toLocaleString('ru-RU')} ₽`} />
        <EventSectionStat
          label={t('collections.statCollected')}
          value={`${totalCollected.toLocaleString('ru-RU')} ₽ · ${collectedPct}%`}
        />
        <EventSectionStat label={t('collections.statPerPerson')} value={`${perPersonTotal.toLocaleString('ru-RU')} ₽`} />
      </EventSectionStats>

      {totalTarget > 0 && (
        <EventSectionProgress
          value={collectedPct}
          label={t('collections.progressCopy', {
            titles: event.collections.map(collection => collection.title).join(', '),
            amount: remaining.toLocaleString('ru-RU'),
          })}
        />
      )}

      {event.collections.length === 0 ? (
        <EventSectionEmpty icon={Wallet}>{t('collections.empty')}</EventSectionEmpty>
      ) : contributionRows.length === 0 ? (
        <EventSectionEmpty icon={Wallet}>{t('collections.noContributions')}</EventSectionEmpty>
      ) : (
        <EventSectionList>
          {contributionRows.map(({ collection, contribution }) => {
            const initials = contribution.user.name
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map(part => part[0])
              .join('')
              .toUpperCase()
            const isPaid = contribution.status === 'paid'
            const isPending = contribution.status === 'pending'
            const canSubmit = contribution.user.is_me && contribution.status === 'not_paid' && !isCompleted
            const canReview = isOrganizer && isPending && !isCompleted && contribution.id
            const canMarkPaid = isOrganizer && contribution.user.is_me && contribution.status === 'not_paid' && !isCompleted
            const note = isPaid
              ? t('collections.noteConfirmed')
              : isPending
                ? t('collections.notePending')
                : t('collections.noteNotPaid', { collection: collection.title })
            const status = isPaid
              ? t('collections.paidAmount', { amount: collection.per_person_amount.toLocaleString('ru-RU') })
              : isPending
                ? t('collections.statusReview')
                : t('collections.statusNotPaid')

            return (
              <EventSectionDataRow
                key={`${collection.id}:${contribution.user.email}`}
                avatar={initials}
                name={contribution.user.name}
                note={note}
                status={canSubmit || canMarkPaid ? (
                  <button
                    type="button"
                    disabled={submitContribution.isPending || markPaid.isPending}
                    onClick={() => {
                      if (canMarkPaid) markPaid.mutate({ collectionId: collection.id })
                      else setActiveCollectionId(collection.id)
                    }}
                    className="font-bold text-success transition hover:opacity-70 disabled:opacity-40"
                  >
                    {t('collections.buttonContribute')}
                  </button>
                ) : status}
                statusTone={isPaid ? 'success' : isPending ? 'warning' : 'neutral'}
                details={canReview ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-[11px] bg-bg-2/70 px-3 py-2">
                    {contribution.receipt_url ? (
                      <a
                        href={contribution.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-accent"
                      >
                        <ExternalLink size={11} /> {t('collections.viewReceipt')}
                      </a>
                    ) : <span />}
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        onClick={() => confirmContribution.mutate({ collectionId: collection.id, contribId: contribution.id! })}
                        disabled={confirmContribution.isPending}
                      >
                        <Check size={12} /> {t('collections.confirm')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rejectContribution.mutate({ collectionId: collection.id, contribId: contribution.id! })}
                        disabled={rejectContribution.isPending}
                      >
                        {t('collections.reject')}
                      </Button>
                    </div>
                  </div>
                ) : undefined}
              />
            )
          })}
        </EventSectionList>
      )}
    </div>
  )
}
