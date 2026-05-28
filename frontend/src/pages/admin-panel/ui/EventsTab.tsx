import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import { useAdminRecentEvents } from '@/entities/admin-stats/queries'
import { formatDate } from '@/shared/lib/formatDate'
import { EventTag, StatusPill } from '@/shared/ui'

export default function EventsTab() {
  const { t } = useTranslation()
  const recent = useAdminRecentEvents(20)

  return (
    <div className="rounded-[14px] border border-line bg-surface p-5">
      <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-ink mb-4">
        {t('admin.events.recent', 'Недавние встречи')}
      </h2>
      {recent.isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-9 rounded-[7px] bg-bg-2 animate-pulse" />
          ))}
        </div>
      ) : (recent.data?.length ?? 0) === 0 ? (
        <div className="text-[13px] text-ink-3">{t('admin.empty', 'Нет данных')}</div>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-[13px]">
            <thead className="border-b border-line">
              <tr>
                <Th>{t('admin.events.title', 'Название')}</Th>
                <Th>{t('admin.events.category', 'Категория')}</Th>
                <Th>{t('admin.events.status', 'Статус')}</Th>
                <Th>{t('admin.events.visibility', 'Тип')}</Th>
                <Th>{t('admin.events.organizer', 'Организатор')}</Th>
                <Th>{t('admin.events.dateStart', 'Начало')}</Th>
                <Th>{t('admin.events.createdAt', 'Создано')}</Th>
              </tr>
            </thead>
            <tbody>
              {recent.data?.map((ev, idx) => (
                <tr key={ev.id} className={idx === 0 ? '' : 'border-t border-line-soft'}>
                  <Td>
                    <RouterLink to={`/events/${ev.id}`} className="font-medium text-accent hover:opacity-80 truncate inline-block max-w-[260px]">
                      {ev.title}
                    </RouterLink>
                  </Td>
                  <Td>
                    <EventTag variant={ev.category === 'business' ? 'work' : 'default'}>
                      {t(`admin.events.category_${ev.category}`, ev.category)}
                    </EventTag>
                  </Td>
                  <Td>
                    <StatusPill variant={ev.status === 'completed' ? 'completed' : 'going'} size="sm">
                      {t(`admin.events.status_${ev.status}`, ev.status)}
                    </StatusPill>
                  </Td>
                  <Td>
                    <EventTag variant={ev.is_public ? 'public' : 'default'}>
                      {ev.is_public
                        ? t('admin.events.visibility_public', 'Публичная')
                        : t('admin.events.visibility_private', 'Личная')}
                    </EventTag>
                  </Td>
                  <Td className="text-ink-2 max-w-[220px]">
                    <span className="truncate inline-block max-w-full">{ev.organizer_email}</span>
                  </Td>
                  <Td className="text-ink-2 tnum">{formatDate(ev.date_start)}</Td>
                  <Td className="text-ink-3 tnum">{formatDate(ev.created_at)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3 py-2 px-2 whitespace-nowrap">
      {children}
    </th>
  )
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`py-2.5 px-2 ${className ?? ''}`}>{children}</td>
}
