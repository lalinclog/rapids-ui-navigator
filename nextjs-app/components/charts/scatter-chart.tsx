"use client"

import {
  ScatterChart as RechartsScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Legend,
  LabelList,
} from "recharts"

interface ScatterChartProps {
  data: any[]
  colors?: string[]
  showDataLabels?: boolean
  dotSize?: number
  showTrendline?: boolean
}

export default function ScatterChart({
  data,
  colors = ["#4ade80", "#60a5fa", "#f97316", "#a78bfa", "#f43f5e"],
  showDataLabels = false,
  dotSize = 5,
}: ScatterChartProps) {
  console.log("SCATTER CHART - Rendering with props:", {
    dataLength: data.length,
    showDataLabels,
    dotSize,
  })

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsScatterChart
        margin={{
          top: 20,
          right: 20,
          bottom: 20,
          left: 20,
        }}
      >
        <CartesianGrid />
        <XAxis type="number" dataKey="x" name="x" tick={{ fontSize: 12 }} />
        <YAxis type="number" dataKey="y" name="y" tick={{ fontSize: 12 }} />
        <ZAxis type="number" dataKey="z" range={[60, 400]} name="z" />
        <Tooltip cursor={{ strokeDasharray: "3 3" }} />
        <Legend />
        <Scatter name="Values" data={data} fill={colors[0]} shape="circle">
          {showDataLabels && <LabelList dataKey="name" position="top" style={{ fill: "#333", fontSize: 10 }} />}
        </Scatter>
      </RechartsScatterChart>
    </ResponsiveContainer>
  )
}
