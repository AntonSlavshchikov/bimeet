import type { ReactNode } from 'react'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  title: string
  children?: ReactNode
  onClose: () => void
  footer?: ReactNode
}

// Lightweight modal (no Radix dependency): fixed overlay + centered card.
export function Modal({ open, title, children, onClose, footer }: ModalProps) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] rounded-[var(--radius-card)] bg-surface border border-line p-5 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-[16px] font-bold text-ink">{title}</h2>
        {children && <div className="mt-3 text-[14px] text-ink-2">{children}</div>}
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

interface ConfirmModalProps {
  open: boolean
  title: string
  body?: string
  confirmLabel?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmModal({
  open,
  title,
  body,
  confirmLabel = 'Подтвердить',
  danger,
  loading,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button
            variant="primary"
            loading={loading}
            onClick={onConfirm}
            className={danger ? 'bg-danger' : undefined}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {body}
    </Modal>
  )
}
