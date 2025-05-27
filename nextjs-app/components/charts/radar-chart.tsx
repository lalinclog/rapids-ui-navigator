"use client"

import {
  RadarChart as RechartsRadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
} from "recharts"

interface RadarChartProps {
  data: any[]
  colors?: string[]
  showDataLabels?: boolean
  radarFill?: boolean
  radarOpacity?: number
  radarGridCount?: number
  labelKey?: string
}

export default function RadarChart({
  data,
  colors = ["#4ade80", "#60a5fa", "#f97316", "#a78bfa", "#f43f5e"],
  showDataLabels = false,
  radarFill = true,
  radarOpacity = 0.6,
  radarGridCount = 5,
  labelKey = "name",
}: RadarChartProps) {
  console.log("RADAR CHART - Rendering with props:", {
    dataLength: data.length,
    showDataLabels,
    radarFill,
    radarOpacity,
    radarGridCount,
  })

  // Get all data keys except the label key
  const dataKeys =
    data.length > 0
      ? Object.keys(data[0]).filter((key) => key !== labelKey && typeof data[0][key] === "number")
      : ["value"]

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsRadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid gridCount={radarGridCount} />
        <PolarAngleAxis dataKey={labelKey} />
        <PolarRadiusAxis angle={90} domain={[0, "auto"]} />
        {dataKeys.map((key, index) => (
          <Radar
            key={key}
            name={key}
            dataKey={key}
            stroke={colors[index % colors.length]}
            fill={radarFill ? colors[index % colors.length] : "none"}
            fillOpacity={radarOpacity}
          >
            {showDataLabels && <LabelList dataKey={key} position="top" style={{ fill: "#333", fontSize: 10 }} />}
          </Radar>
        ))}
        <Legend />
        <Tooltip />
      </RechartsRadarChart>
    </ResponsiveContainer>
  )
}
