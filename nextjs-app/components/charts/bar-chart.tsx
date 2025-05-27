"use client"

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
} from "recharts"

interface BarChartProps {
  data: any[]
  layout?: "vertical" | "horizontal" | "grouped" | "stacked"
  colors?: string[]
  showDataLabels?: boolean
  barRadius?: number
  labelKey?: string
  valueKey?: string
}

export default function BarChart({
  data,
  layout = "vertical",
  colors = ["#4ade80", "#60a5fa", "#f97316", "#a78bfa", "#f43f5e"],
  showDataLabels = false,
  barRadius = 0,
  labelKey = "name",
  valueKey = "value",
}: BarChartProps) {
  console.log("BAR CHART - Rendering with props:", {
    dataLength: data.length,
    layout,
    showDataLabels,
    barRadius,
    labelKey,
    valueKey,
  })

  // For grouped and stacked charts, we need to identify all data keys except the label key
  const dataKeys =
    data.length > 0
      ? Object.keys(data[0]).filter((key) => key !== labelKey && typeof data[0][key] === "number")
      : [valueKey]

  // Handle horizontal layout
  if (layout === "horizontal") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={data}
          layout="vertical"
          margin={{
            top: 5,
            right: 30,
            left: 30, // More space for labels on the left
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis dataKey={labelKey} type="category" tick={{ fontSize: 12 }} width={80} />
          <Tooltip />
          {dataKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={colors[index % colors.length]}
              radius={[barRadius, barRadius, barRadius, barRadius]}
              name={key}
            >
              {showDataLabels && <LabelList dataKey={key} position="right" style={{ fill: "#333", fontSize: 10 }} />}
            </Bar>
          ))}
          <Legend />
        </RechartsBarChart>
      </ResponsiveContainer>
    )
  }

  // Handle grouped layout
  if (layout === "grouped") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 0,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={labelKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          {dataKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={colors[index % colors.length]}
              radius={[barRadius, barRadius, 0, 0]}
              name={key}
            >
              {showDataLabels && <LabelList dataKey={key} position="top" style={{ fill: "#333", fontSize: 10 }} />}
            </Bar>
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    )
  }

  // Handle stacked layout
  if (layout === "stacked") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 0,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={labelKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          {dataKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={colors[index % colors.length]}
              stackId="a"
              radius={[barRadius, barRadius, 0, 0]}
              name={key}
            >
              {showDataLabels && <LabelList dataKey={key} position="inside" style={{ fill: "#fff", fontSize: 10 }} />}
            </Bar>
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    )
  }

  // Default vertical layout
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsBarChart
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 0,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={labelKey} tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        {dataKeys.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            fill={colors[index % colors.length]}
            radius={[barRadius, barRadius, 0, 0]}
            name={key}
          >
            {showDataLabels && <LabelList dataKey={key} position="top" style={{ fill: "#333", fontSize: 10 }} />}
          </Bar>
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}
