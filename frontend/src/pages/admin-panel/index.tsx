import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import OverviewTab from '@/pages/admin-panel/ui/OverviewTab'
import UsersTab from '@/pages/admin-panel/ui/UsersTab'
import EventsTab from '@/pages/admin-panel/ui/EventsTab'
import { SegmentedControl } from '@/shared/ui'

type Tab = 'overview' | 'users' | 'events'

export default function AdminPanelPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('overview')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[28px] font-bold tracking-[-0.022em] leading-[1.15] text-ink">
          {t('admin.title', 'Админ-панель')}
        </h1>
        <p className="mt-1.5 text-[13.5px] text-ink-3 font-medium">
          {t('admin.subtitle', 'Статистика, пользователи и встречи')}
        </p>
      </div>

      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: 'overview', label: t('admin.tabs.overview', 'Обзор') },
          { value: 'users', label: t('admin.tabs.users', 'Пользователи') },
          { value: 'events', label: t('admin.tabs.events', 'Встречи') },
        ]}
      />

      <div>
        {tab === 'overview' && <OverviewTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'events' && <EventsTab />}
      </div>
    </div>
  )
}
