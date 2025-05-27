"use client"

import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface AreaChartProps {
  data: any[]
  colors?: string[]
}

export default function AreaChart({
  data,
  colors = ["#4ade80", "#60a5fa", "#f97316", "#a78bfa", "#f43f5e"],
}: AreaChartProps) {
  // Identify all data keys except 'name'
  const dataKeys = data.length > 0 ? Object.keys(data[0]).filter((key) => key !== "name") : ["value"]

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsAreaChart
        data={data}
        margin={{
          top: 10,
          right: 30,
          left: 0,
          bottom: 0,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        {dataKeys.map((key, index) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stroke={colors[index % colors.length]}
            fill={`${colors[index % colors.length]}80`} // 50% opacity
            name={key}
          />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  )
}
