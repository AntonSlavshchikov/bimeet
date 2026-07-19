import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Activity,
  Calendar,
  DollarSign,
  List,
  UserCheck,
  Users,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  useAdminDistribution,
  useAdminOverview,
  useAdminTimeseries,
} from '@/entities/admin-stats/queries'
import AdminKpiCard from '@/widgets/admin-kpi-card'
import AdminLineChart from '@/widgets/admin-line-chart'
import { SegmentedControl } from '@/shared/ui'

const PIE_COLORS = ['var(--color-brand-b)', 'var(--color-success)', 'var(--color-warning)', 'var(--color-danger)', 'var(--color-brand-a)']

function formatNumber(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(n)
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n)
}

export default function OverviewTab() {
  const { t } = useTranslation()
  const [days, setDays] = useState<30 | 90>(30)

  const overview = useAdminOverview()
  const timeseries = useAdminTimeseries(days)
  const distribution = useAdminDistribution()

  const kpis = overview.data

  const chartData = useMemo(
    () =>
      (timeseries.data?.points ?? []).map((p) => ({
        date: p.date.slice(5),
        users: p.users,
        events: p.events,
      })),
    [timeseries.data],
  )

  const categoryData = distribution.data?.by_category ?? []
  const statusData = distribution.data?.by_status ?? []

  return (
    <div className="flex flex-col gap-6">
      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiSkeleton loading={overview.isLoading}>
          <AdminKpiCard label={t('admin.kpi.totalUsers', 'Пользователи')} value={formatNumber(kpis?.total_users ?? 0)} icon={Users} />
        </KpiSkeleton>
        <KpiSkeleton loading={overview.isLoading}>
          <AdminKpiCard
            label={t('admin.kpi.activeUsers7d', 'Активны 7д')}
            value={formatNumber(kpis?.users_active_7d ?? 0)}
            icon={UserCheck}
            hint={t('admin.kpi.activeUsers30dHint', { count: kpis?.users_active_30d ?? 0, defaultValue: `${kpis?.users_active_30d ?? 0} за 30 дн.` })}
          />
        </KpiSkeleton>
        <KpiSkeleton loading={overview.isLoading}>
          <AdminKpiCard label={t('admin.kpi.totalEvents', 'Встречи')} value={formatNumber(kpis?.total_events ?? 0)} icon={Calendar} />
        </KpiSkeleton>
        <KpiSkeleton loading={overview.isLoading}>
          <AdminKpiCard
            label={t('admin.kpi.activeEvents', 'Активные')}
            value={formatNumber(kpis?.events_active ?? 0)}
            icon={Activity}
            hint={t('admin.kpi.completedHint', { count: kpis?.events_completed ?? 0, defaultValue: `${kpis?.events_completed ?? 0} завершены` })}
          />
        </KpiSkeleton>
        <KpiSkeleton loading={overview.isLoading}>
          <AdminKpiCard label={t('admin.kpi.totalCollections', 'Сборы')} value={formatNumber(kpis?.total_collections ?? 0)} icon={List} />
        </KpiSkeleton>
        <KpiSkeleton loading={overview.isLoading}>
          <AdminKpiCard label={t('admin.kpi.totalCollected', 'Собрано')} value={formatMoney(kpis?.total_collected ?? 0)} icon={DollarSign} />
        </KpiSkeleton>
      </div>

      {/* Timeseries chart */}
      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 mb-4">
          <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-ink">
            {t('admin.charts.timeseries', 'Регистрации и встречи')}
          </h2>
          <SegmentedControl
            value={String(days) as '30' | '90'}
            onChange={v => setDays(Number(v) as 30 | 90)}
            options={[
              { value: '30', label: t('admin.charts.range30', '30 дней') },
              { value: '90', label: t('admin.charts.range90', '90 дней') },
            ]}
          />
        </div>
        {timeseries.isLoading ? (
          <SkeletonBlock height={280} />
        ) : (
          <AdminLineChart
            data={chartData}
            xKey="date"
            series={[
              { dataKey: 'users', name: t('admin.charts.users', 'Пользователи') },
              { dataKey: 'events', name: t('admin.charts.events', 'Встречи') },
            ]}
          />
        )}
      </div>

      {/* Distribution charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title={t('admin.charts.byCategory', 'По категориям')}>
          {distribution.isLoading ? (
            <SkeletonBlock height={240} />
          ) : categoryData.length === 0 ? (
            <EmptyHint label={t('admin.empty', 'Нет данных')} />
          ) : (
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-line)" />
                  <XAxis dataKey="key" tick={{ fontSize: 12, fill: 'var(--color-ink-3)' }} tickLine={false} axisLine={{ stroke: 'var(--color-line)' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--color-ink-3)' }} tickLine={false} allowDecimals={false} axisLine={{ stroke: 'var(--color-line)' }} />
                  <Tooltip contentStyle={{ background: 'var(--color-surface)', color: 'var(--color-ink)', border: '1px solid var(--color-line)', borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="count" fill="var(--color-brand-b)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title={t('admin.charts.byStatus', 'По статусу')}>
          {distribution.isLoading ? (
            <SkeletonBlock height={240} />
          ) : statusData.length === 0 ? (
            <EmptyHint label={t('admin.empty', 'Нет данных')} />
          ) : (
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="count"
                    nameKey="key"
                    innerRadius={48}
                    outerRadius={84}
                    paddingAngle={2}
                  >
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--color-surface)', color: 'var(--color-ink)', border: '1px solid var(--color-line)', borderRadius: 12, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-ink-3)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <h3 className="text-[15px] font-semibold tracking-[-0.015em] text-ink mb-4">{title}</h3>
      {children}
    </div>
  )
}

function SkeletonBlock({ height }: { height: number }) {
  return (
    <div className="rounded-[10px] bg-bg-2 animate-pulse" style={{ height }} />
  )
}

function EmptyHint({ label }: { label: string }) {
  return <div className="text-[13px] text-ink-3">{label}</div>
}

function KpiSkeleton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  if (loading) {
    return <div className="h-[92px] rounded-[12px] bg-bg-2 animate-pulse" />
  }
  return <>{children}</>
}
