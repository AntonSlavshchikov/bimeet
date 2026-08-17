import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export interface AdminLineSeries {
  dataKey: string
  name: string
  color?: string
}

interface AdminLineChartProps {
  data: ReadonlyArray<Record<string, string | number>>
  xKey: string
  series: AdminLineSeries[]
  height?: number
}

const DEFAULT_COLORS = ['var(--color-brand-b)', 'var(--color-brand-c)', 'var(--color-success)', 'var(--color-warning)', 'var(--color-brand-a)']

export default function AdminLineChart({
  data,
  xKey,
  series,
  height = 280,
}: AdminLineChartProps) {
  const gridColor = 'var(--color-line)'
  const axisColor = 'var(--color-ink-3)'
  const tooltipBg = 'var(--color-surface)'
  const tooltipBorder = 'var(--color-line)'
  const tooltipText = 'var(--color-ink)'

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={[...data]} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fill: axisColor, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: gridColor }}
          />
          <YAxis
            tick={{ fill: axisColor, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: gridColor }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: 9,
              color: tooltipText,
              fontSize: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            }}
            labelStyle={{ color: tooltipText, fontWeight: 600 }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: axisColor }} />
          {series.map((s, i) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              stroke={s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
