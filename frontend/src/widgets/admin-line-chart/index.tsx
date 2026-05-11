import { Box, useToken } from '@chakra-ui/react'
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

export default function AdminLineChart({
  data,
  xKey,
  series,
  height = 280,
}: AdminLineChartProps) {
  const [gridColor, axisColor, tooltipBg, tooltipBorder, tooltipText] = useToken('colors', [
    'cardBorder',
    'dimText',
    'cardBg',
    'cardBorder',
    'mainText',
  ])
  const [brand500, brand600] = useToken('colors', ['brand.500', 'brand.600'])
  const defaultColors = [brand600, brand500, '#22c55e', '#f97316']

  return (
    <Box w="full" h={height}>
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
              borderRadius: 8,
              color: tooltipText,
              fontSize: 12,
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
              stroke={s.color ?? defaultColors[i % defaultColors.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  )
}
