"use client"

import {
  RadialBarChart as RechartsRadialBarChart,
  RadialBar,
  Legend,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts"

interface RadialBarChartProps {
  data: any[]
  colors?: string[]
  showDataLabels?: boolean
  radialBarSize?: number
  radialStartAngle?: number
  radialEndAngle?: number
  radialBarBackground?: boolean
  labelKey?: string
  valueKey?: string
}

export default function RadialBarChart({
  data,
  colors = ["#4ade80", "#60a5fa", "#f97316", "#a78bfa", "#f43f5e"],
  showDataLabels = false,
  radialBarSize = 10,
  radialStartAngle = 0,
  radialEndAngle = 360,
  radialBarBackground = true,
  labelKey = "name",
  valueKey = "value",
}: RadialBarChartProps) {
  console.log("RADIAL BAR CHART - Rendering with props:", {
    dataLength: data.length,
    showDataLabels,
    radialBarSize,
    radialStartAngle,
    radialEndAngle,
  })

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsRadialBarChart
        cx="50%"
        cy="50%"
        innerRadius="10%"
        outerRadius="80%"
        barSize={radialBarSize}
        data={data}
        startAngle={radialStartAngle}
        endAngle={radialEndAngle}
      >
        {radialBarBackground && <RadialBar background />}
        <RadialBar minAngle={15} label={{ position: "insideStart", fill: "#fff" }} background dataKey={valueKey}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
          {showDataLabels && <LabelList dataKey={labelKey} position="inside" style={{ fill: "#fff", fontSize: 10 }} />}
        </RadialBar>
        <Legend
          iconSize={10}
          layout="vertical"
          verticalAlign="middle"
          align="right"
          formatter={(value, entry, index) => entry.payload[labelKey]}
        />
        <Tooltip />
      </RechartsRadialBarChart>
    </ResponsiveContainer>
  )
}
