import {
  Box,
  Button,
  Grid,
  HStack,
  Heading,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FiActivity,
  FiCalendar,
  FiDollarSign,
  FiList,
  FiUserCheck,
  FiUsers,
} from 'react-icons/fi'
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

const PIE_COLORS = ['#6366f1', '#22c55e', '#f97316', '#ef4444', '#0ea5e9']

function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(n)
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n)
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
        date: p.date.slice(5), // MM-DD
        users: p.users,
        events: p.events,
      })),
    [timeseries.data],
  )

  const categoryData = distribution.data?.by_category ?? []
  const statusData = distribution.data?.by_status ?? []

  return (
    <VStack align="stretch" spacing={6}>
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 3, xl: 6 }} spacing={4}>
        <KpiSkeleton loading={overview.isLoading}>
          <AdminKpiCard
            label={t('admin.kpi.totalUsers')}
            value={formatNumber(kpis?.total_users ?? 0)}
            icon={FiUsers}
          />
        </KpiSkeleton>
        <KpiSkeleton loading={overview.isLoading}>
          <AdminKpiCard
            label={t('admin.kpi.activeUsers7d')}
            value={formatNumber(kpis?.users_active_7d ?? 0)}
            icon={FiUserCheck}
            hint={t('admin.kpi.activeUsers30dHint', {
              count: kpis?.users_active_30d ?? 0,
            })}
          />
        </KpiSkeleton>
        <KpiSkeleton loading={overview.isLoading}>
          <AdminKpiCard
            label={t('admin.kpi.totalEvents')}
            value={formatNumber(kpis?.total_events ?? 0)}
            icon={FiCalendar}
          />
        </KpiSkeleton>
        <KpiSkeleton loading={overview.isLoading}>
          <AdminKpiCard
            label={t('admin.kpi.activeEvents')}
            value={formatNumber(kpis?.events_active ?? 0)}
            icon={FiActivity}
            hint={t('admin.kpi.completedHint', {
              count: kpis?.events_completed ?? 0,
            })}
          />
        </KpiSkeleton>
        <KpiSkeleton loading={overview.isLoading}>
          <AdminKpiCard
            label={t('admin.kpi.totalCollections')}
            value={formatNumber(kpis?.total_collections ?? 0)}
            icon={FiList}
          />
        </KpiSkeleton>
        <KpiSkeleton loading={overview.isLoading}>
          <AdminKpiCard
            label={t('admin.kpi.totalCollected')}
            value={formatMoney(kpis?.total_collected ?? 0)}
            icon={FiDollarSign}
          />
        </KpiSkeleton>
      </SimpleGrid>

      <Box
        bg="cardBg"
        borderWidth="1px"
        borderColor="cardBorder"
        borderRadius="lg"
        p={5}
      >
        <Stack
          direction={{ base: 'column', md: 'row' }}
          justify="space-between"
          align={{ base: 'start', md: 'center' }}
          spacing={3}
          mb={4}
        >
          <Heading size="sm" color="mainText">
            {t('admin.charts.timeseries')}
          </Heading>
          <HStack spacing={2}>
            <Button
              size="xs"
              variant={days === 30 ? 'solid' : 'outline'}
              colorScheme="blue"
              onClick={() => setDays(30)}
            >
              {t('admin.charts.range30')}
            </Button>
            <Button
              size="xs"
              variant={days === 90 ? 'solid' : 'outline'}
              colorScheme="blue"
              onClick={() => setDays(90)}
            >
              {t('admin.charts.range90')}
            </Button>
          </HStack>
        </Stack>
        {timeseries.isLoading ? (
          <Skeleton h="280px" borderRadius="md" />
        ) : (
          <AdminLineChart
            data={chartData}
            xKey="date"
            series={[
              { dataKey: 'users', name: t('admin.charts.users') },
              { dataKey: 'events', name: t('admin.charts.events') },
            ]}
          />
        )}
      </Box>

      <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6}>
        <Box
          bg="cardBg"
          borderWidth="1px"
          borderColor="cardBorder"
          borderRadius="lg"
          p={5}
        >
          <Heading size="sm" mb={4} color="mainText">
            {t('admin.charts.byCategory')}
          </Heading>
          {distribution.isLoading ? (
            <Skeleton h="240px" borderRadius="md" />
          ) : categoryData.length === 0 ? (
            <Text color="dimText" fontSize="sm">
              {t('admin.empty')}
            </Text>
          ) : (
            <Box h="240px">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chakra-colors-cardBorder)" />
                  <XAxis dataKey="key" tick={{ fontSize: 12 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Box>

        <Box
          bg="cardBg"
          borderWidth="1px"
          borderColor="cardBorder"
          borderRadius="lg"
          p={5}
        >
          <Heading size="sm" mb={4} color="mainText">
            {t('admin.charts.byStatus')}
          </Heading>
          {distribution.isLoading ? (
            <Skeleton h="240px" borderRadius="md" />
          ) : statusData.length === 0 ? (
            <Text color="dimText" fontSize="sm">
              {t('admin.empty')}
            </Text>
          ) : (
            <Box h="240px">
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
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Box>
      </Grid>
    </VStack>
  )
}

function KpiSkeleton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  if (loading) return <Skeleton h="92px" borderRadius="lg" />
  return <>{children}</>
}
