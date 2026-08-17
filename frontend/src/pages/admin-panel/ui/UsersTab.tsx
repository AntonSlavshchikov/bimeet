import { useTranslation } from 'react-i18next'
import {
  useAdminRecentUsers,
  useAdminTopOrganizers,
} from '@/entities/admin-stats/queries'
import { formatDate } from '@/shared/lib/formatDate'

export default function UsersTab() {
  const { t } = useTranslation()
  const recent = useAdminRecentUsers(20)
  const top = useAdminTopOrganizers(10)

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-5 items-start">
      {/* Recent users */}
      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-ink mb-4">
          {t('admin.users.recent', 'Недавние пользователи')}
        </h2>
        {recent.isLoading ? (
          <SkeletonList count={6} h={36} />
        ) : (recent.data?.length ?? 0) === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="border-b border-line">
                <tr>
                  <Th>{t('admin.users.name', 'Имя')}</Th>
                  <Th>{t('admin.users.email', 'Email')}</Th>
                  <Th>{t('admin.users.city', 'Город')}</Th>
                  <Th>{t('admin.users.createdAt', 'Создан')}</Th>
                </tr>
              </thead>
              <tbody>
                {recent.data?.map((u, idx) => (
                  <tr key={u.id} className={idx === 0 ? '' : 'border-t border-line-soft'}>
                    <Td>
                      <span className="font-medium text-ink">
                        {[u.name, u.last_name].filter(Boolean).join(' ') || '—'}
                      </span>
                    </Td>
                    <Td className="text-ink-2">{u.email}</Td>
                    <Td className="text-ink-2">{u.city || '—'}</Td>
                    <Td className="text-ink-3 tnum">{formatDate(u.created_at)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top organizers */}
      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-ink mb-4">
          {t('admin.users.topOrganizers', 'Топ организаторов')}
        </h2>
        {top.isLoading ? (
          <SkeletonList count={5} h={32} />
        ) : (top.data?.length ?? 0) === 0 ? (
          <Empty />
        ) : (
          <div className="flex flex-col gap-2">
            {top.data?.map((o, idx) => (
              <div
                key={o.user_id}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-[8px] bg-bg-2"
              >
                <div className="min-w-0">
                  <div className="font-medium text-ink text-[13.5px] truncate">
                    {idx + 1}. {o.name || o.email}
                  </div>
                  <div className="text-[11.5px] text-ink-3 truncate">{o.email}</div>
                </div>
                <div className="text-[14px] font-semibold text-accent tnum shrink-0">{o.event_count}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3 py-2 px-2">
      {children}
    </th>
  )
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`py-2.5 px-2 ${className ?? ''}`}>{children}</td>
}

function SkeletonList({ count, h }: { count: number; h: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-[7px] bg-bg-2 animate-pulse" style={{ height: h }} />
      ))}
    </div>
  )
}

function Empty() {
  return <div className="text-[13px] text-ink-3">—</div>
}
