import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import OverviewTab from '@/pages/admin-panel/ui/OverviewTab'
import UsersTab from '@/pages/admin-panel/ui/UsersTab'
import EventsTab from '@/pages/admin-panel/ui/EventsTab'
import { PageHeader, SegmentedControl } from '@/shared/ui'

type Tab = 'overview' | 'users' | 'events'

export default function AdminPanelPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('overview')

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('admin.title', 'Админ-панель')} subtitle={t('admin.subtitle', 'Статистика, пользователи и встречи')} />

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
