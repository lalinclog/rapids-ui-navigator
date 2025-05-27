"use client"

import { cn } from "@/lib/utils"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  RadialBarChart,
  RadialBar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Sector,
  ReferenceLine,
  LabelList,
  ZAxis,
} from "recharts"
import { useCallback, useState } from "react"

// Add legend position control to the config interface
// Find the ChartComponentProps interface and add legendPosition to the config
interface ChartComponentProps {
  type: string
  data: any
  config?: {
    title?: string
    showLegend?: boolean
    legendPosition?: "top" | "right" | "bottom" | "left"
    colors?: string[]
    showGrid?: boolean
    labelKey?: string
    valueKey?: string
    theme?: string
    showDataLabels?: boolean
    enableAnimation?: boolean
    chartStyle?: string

    // Bar chart specific
    barChartType?: "vertical" | "horizontal" | "grouped" | "stacked"
    barRadius?: number
    barGap?: number
    barCategoryGap?: number

    // Line chart specific
    lineChartType?: "linear" | "curved" | "step" | "area"
    lineWidth?: number
    showDots?: boolean

    // Pie chart specific
    pieChartType?: "pie" | "donut" | "donutActive" | "donutWithText" | "semi" | "interactive"
    innerRadius?: number
    showLabels?: boolean
    showPercentages?: boolean
    activeIndex?: number
    showActiveShape?: boolean
    showCenterText?: boolean
    centerText?: string

    // Area chart specific
    areaChartType?: "default" | "stacked" | "percent"
    fillOpacity?: number

    // Scatter chart specific
    dotSize?: number
    showTrendline?: boolean

    // Radar chart specific
    radarFill?: boolean
    radarOpacity?: number
    radarGridCount?: number

    // Radial chart specific
    radialBarSize?: number
    radialStartAngle?: number
    radialEndAngle?: number
    radialBarBackground?: boolean

    // Common axis settings
    showXAxis?: boolean
    showYAxis?: boolean
    showAxisLine?: boolean
    showTickLine?: boolean
    tickMargin?: number
    scaleType?: "linear" | "log"

    // Tooltip settings
    tooltipStyle?: string
    tooltipBgColor?: string
    tooltipAnimated?: boolean

    // Reference Line
    showReferenceLine?: boolean
    referenceLineValue?: number
    referenceLineLabel?: string
    referenceLineColor?: string
    referenceLineStroke?: string

    // Animation
    animationDuration?: number
    animationEasing?: string
    // Common
    showValues?: boolean
  }
}

export default function ChartComponent({ type, data, config = {} }: ChartComponentProps) {
  console.log("CHART COMPONENT - Received props:", { type, hasData: !!data, data, config })

  // Update the destructuring of config to include legendPosition with a default value
  const {
    colors = ["#38bdf8", "#818cf8", "#fb7185", "#34d399", "#fbbf24"],
    showLegend = true,
    legendPosition = "bottom",
    showGrid = true,
    labelKey = "name",
    valueKey = "value",
    theme = "light",
    // Bar chart specific
    barChartType = "vertical",
    barRadius = 0,
    barGap = 4,
    barCategoryGap = 0.2,
    // Line chart specific
    lineChartType = "linear",
    lineWidth = 2,
    showDots = true,
    // Pie chart specific
    pieChartType = "pie",
    innerRadius = 60,
    showLabels = true,
    showPercentages = true,
    // Area chart specific
    areaChartType = "default",
    fillOpacity = 0.5,
    // Scatter chart specific
    dotSize = 5,
    showTrendline = false,
    // Radar chart specific
    radarFill = true,
    radarOpacity = 0.6,
    radarGridCount = 5,
    // Radial chart specific
    radialStartAngle = 0,
    radialEndAngle = 360,
    radialBarSize = 10,
    radialBarBackground = true,
    showXAxis = true,
    showYAxis = true,
    showAxisLine = true,
    showTickLine = true,
    tickMargin = 5,
    tooltipStyle = "default",
    tooltipBgColor = "white",
    tooltipAnimated = false,
    // Scale type
    scaleType = "linear",
    // Reference Line
    showReferenceLine = false,
    referenceLineValue = 0,
    referenceLineLabel = "",
    referenceLineColor = "red",
    referenceLineStroke = "",
    // Animation
    enableAnimation = true,
    animationDuration = 1000,
    animationEasing = "ease",
    showValues = false,
    showDataLabels = false,
  } = config

  // Extract metadata from data if available
  const dataMetadata = data && data.length > 0 && data[0]._metadata ? data[0]._metadata : {}
  const dataScaleType = dataMetadata.scaleType || scaleType

  // Clean data by removing metadata
  const cleanData = data
    ? data.map((item) => {
        const { _metadata, ...rest } = item
        return rest
      })
    : []

  // Generate theme-specific styles
  const getThemeStyles = () => {
    switch (theme) {
      case "dark":
        return {
          backgroundColor: "#1e293b",
          textColor: "#f8fafc",
          gridColor: "#334155",
          tooltipBg: "#0f172a",
          tooltipBorder: "#334155",
        }
      case "blue":
        return {
          backgroundColor: "#eff6ff",
          textColor: "#1e40af",
          gridColor: "#bfdbfe",
          tooltipBg: "#dbeafe",
          tooltipBorder: "#93c5fd",
        }
      case "green":
        return {
          backgroundColor: "#ecfdf5",
          textColor: "#065f46",
          gridColor: "#a7f3d0",
          tooltipBg: "#d1fae5",
          tooltipBorder: "#6ee7b7",
        }
      case "purple":
        return {
          backgroundColor: "#f5f3ff",
          textColor: "#5b21b6",
          gridColor: "#ddd6fe",
          tooltipBg: "#ede9fe",
          tooltipBorder: "#c4b5fd",
        }
      case "light":
      default:
        return {
          backgroundColor: "transparent",
          textColor: "#334155",
          gridColor: "#e2e8f0",
          tooltipBg: "#ffffff",
          tooltipBorder: "#e2e8f0",
        }
    }
  }

  const themeStyles = getThemeStyles()

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full w-full border-2 border-dashed border-gray-200 rounded-md">
        <p className="text-gray-400">No data available</p>
      </div>
    )
  }

  // Define custom tooltip style
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Different tooltip styles
      if (tooltipStyle === "minimal") {
        return (
          <div
            className="px-2 py-1 rounded shadow-sm text-xs"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.75)",
              color: "#fff",
            }}
          >
            {payload.map((entry: any, index: number) => (
              <div key={`item-${index}`} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                <span>{`${entry.value}`}</span>
              </div>
            ))}
          </div>
        )
      }

      if (tooltipStyle === "custom") {
        let bgColor = "#ffffff"
        let textColor = "#000000"

        switch (tooltipBgColor) {
          case "black":
            bgColor = "#000000"
            textColor = "#ffffff"
            break
          case "primary":
            bgColor = "#3b82f6"
            textColor = "#ffffff"
            break
          case "transparent":
            bgColor = "rgba(255, 255, 255, 0.8)"
            textColor = "#000000"
            break
        }

        return (
          <div
            className={`p-2 border rounded shadow-md ${tooltipAnimated ? "animate-in fade-in zoom-in-95 duration-200" : ""}`}
            style={{
              backgroundColor: bgColor,
              borderColor: "rgba(0, 0, 0, 0.1)",
              color: textColor,
            }}
          >
            <p className="font-medium border-b pb-1 mb-1">{`${label}`}</p>
            {payload.map((entry: any, index: number) => (
              <p key={`item-${index}`} className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
                <span>{`${entry.name}: ${entry.value}`}</span>
              </p>
            ))}
          </div>
        )
      }

      // Default tooltip
      return (
        <div
          className="p-2 bg-white border rounded shadow-sm"
          style={{
            backgroundColor: themeStyles.tooltipBg,
            borderColor: themeStyles.tooltipBorder,
            color: themeStyles.textColor,
          }}
        >
          <p className="font-medium">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Custom label for pie chart
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={12}>
        {showLabels && showPercentages
          ? `${name}: ${(percent * 100).toFixed(0)}%`
          : showLabels
            ? name
            : showPercentages
              ? `${(percent * 100).toFixed(0)}%`
              : ""}
      </text>
    )
  }

  // Update the renderActiveShape function for PieChart to support Donut Active and Donut with Text
  const [activeIndex, setActiveIndex] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [chartData, setChartData] = useState(cleanData)
  const [xAxisKey, setXAxisKey] = useState(labelKey)
  const [dataKey, setDataKey] = useState(valueKey)
  const [showTooltip, setShowTooltip] = useState(true)

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props

    return (
      <g>
        <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill}>
          {payload.name}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 6}
          outerRadius={outerRadius + 10}
          fill={fill}
        />
        <text x={cx} y={cy + 20} textAnchor="middle" fill="#999">
          {`${(percent * 100).toFixed(0)}%`}
        </text>
        {config.pieChartType === "donutWithText" && (
          <text x={cx} y={cy + 40} textAnchor="middle" fill="#666" className="text-sm">
            {`Value: ${value}`}
          </text>
        )}
      </g>
    )
  }

  const onPieEnter = useCallback(
    (data: any, index: number) => {
      if (config.pieChartType === "interactive" || config.pieChartType === "donutActive") {
        setActiveIndex(index)
      }
    },
    [config.pieChartType, setActiveIndex],
  )

  const getAnimationProps = () => {
    return enableAnimation ? { animationDuration, animationEasing } : { animation: false }
  }

  // Get all data keys except the label key for multi-series charts
  const getDataKeys = () => {
    if (!chartData || chartData.length === 0) return [valueKey]
    return Object.keys(chartData[0]).filter((key) => key !== xAxisKey && typeof chartData[0][key] === "number")
  }

  const dataKeys = getDataKeys()

  // Configure scale type for axes
  const getScaleType = () => {
    return dataScaleType === "log" ? "log" : "auto"
  }

  return (
    <div
      className={cn("h-full w-full", { "bg-muted/50": isEditing })}
      style={{ backgroundColor: themeStyles.backgroundColor }}
    >
      {type === "bar-chart" && (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout={barChartType === "horizontal" ? "vertical" : "horizontal"}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            {...getAnimationProps()}
          >
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={themeStyles.gridColor} />}
            {showXAxis && (
              <XAxis
                dataKey={barChartType === "horizontal" ? undefined : xAxisKey}
                type={barChartType === "horizontal" ? "number" : "category"}
                tick={{ fill: themeStyles.textColor }}
                scale={barChartType === "horizontal" ? getScaleType() : undefined}
              />
            )}
            {showYAxis && (
              <YAxis
                dataKey={barChartType === "horizontal" ? xAxisKey : undefined}
                type={barChartType === "horizontal" ? "category" : "number"}
                tick={{ fill: themeStyles.textColor }}
                scale={barChartType === "horizontal" ? undefined : getScaleType()}
              />
            )}
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && (
              <Legend
                wrapperStyle={{ color: themeStyles.textColor }}
                layout={legendPosition === "left" || legendPosition === "right" ? "vertical" : "horizontal"}
                align={legendPosition === "right" ? "right" : legendPosition === "left" ? "left" : "center"}
                verticalAlign={legendPosition === "bottom" ? "bottom" : legendPosition === "top" ? "top" : "middle"}
              />
            )}
            {barChartType === "stacked" || barChartType === "grouped" ? (
              // For stacked and grouped charts, render multiple bars
              dataKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={colors[index % colors.length]}
                  name={key}
                  radius={[barRadius, barRadius, barRadius, barRadius]}
                  stackId={barChartType === "stacked" ? "a" : undefined}
                >
                  {showDataLabels && (
                    <LabelList
                      dataKey={key}
                      position={barChartType === "stacked" ? "inside" : "top"}
                      style={{
                        fill: barChartType === "stacked" ? "#fff" : "#333",
                        fontSize: 10,
                      }}
                    />
                  )}
                </Bar>
              ))
            ) : (
              // For simple vertical or horizontal charts
              <Bar
                dataKey={valueKey}
                fill={colors[0]}
                name={valueKey}
                radius={[barRadius, barRadius, barRadius, barRadius]}
              >
                {showDataLabels && (
                  <LabelList
                    dataKey={valueKey}
                    position={barChartType === "horizontal" ? "right" : "top"}
                    style={{ fill: "#333", fontSize: 10 }}
                  />
                )}
              </Bar>
            )}
            {showReferenceLine && (
              <ReferenceLine
                y={barChartType === "horizontal" ? undefined : referenceLineValue}
                x={barChartType === "horizontal" ? referenceLineValue : undefined}
                label={referenceLineLabel || undefined}
                stroke={referenceLineColor}
                strokeDasharray={
                  referenceLineStroke === "dashed" ? "3 3" : referenceLineStroke === "dotted" ? "1 3" : undefined
                }
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      )}

      {type === "line-chart" && (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} {...getAnimationProps()}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={themeStyles.gridColor} />}
            {showXAxis && <XAxis dataKey={xAxisKey} tick={{ fill: themeStyles.textColor }} />}
            {showYAxis && <YAxis tick={{ fill: themeStyles.textColor }} scale={getScaleType()} />}
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && (
              <Legend
                wrapperStyle={{ color: themeStyles.textColor }}
                layout={legendPosition === "left" || legendPosition === "right" ? "vertical" : "horizontal"}
                align={legendPosition === "right" ? "right" : legendPosition === "left" ? "left" : "center"}
                verticalAlign={legendPosition === "bottom" ? "bottom" : legendPosition === "top" ? "top" : "middle"}
              />
            )}
            {dataKeys.map((key, index) => (
              <Line
                key={key}
                type={lineChartType === "curved" ? "natural" : lineChartType === "step" ? "stepAfter" : "monotone"}
                dataKey={key}
                stroke={colors[index % colors.length]}
                name={key}
                strokeWidth={lineWidth}
                dot={showDots ? { r: 4 } : false}
                activeDot={{ r: 6 }}
              >
                {showDataLabels && <LabelList dataKey={key} position="top" style={{ fill: "#333", fontSize: 10 }} />}
              </Line>
            ))}
            {showReferenceLine && (
              <ReferenceLine
                y={referenceLineValue}
                label={referenceLineLabel || undefined}
                stroke={referenceLineColor}
                strokeDasharray={
                  referenceLineStroke === "dashed" ? "3 3" : referenceLineStroke === "dotted" ? "1 3" : undefined
                }
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}

      {type === "pie-chart" && (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart {...getAnimationProps()}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={showLabels}
              label={showLabels ? renderCustomizedLabel : undefined}
              outerRadius={80}
              innerRadius={
                pieChartType === "donut" || pieChartType === "donutActive" || pieChartType === "donutWithText"
                  ? innerRadius
                  : 0
              }
              fill="#8884d8"
              dataKey={dataKey}
              nameKey={xAxisKey}
              startAngle={pieChartType === "semi" ? 180 : radialStartAngle}
              endAngle={pieChartType === "semi" ? 0 : radialEndAngle}
              activeIndex={pieChartType === "interactive" || pieChartType === "donutActive" ? activeIndex : undefined}
              activeShape={
                pieChartType === "interactive" || pieChartType === "donutActive" || pieChartType === "donutWithText"
                  ? renderActiveShape
                  : undefined
              }
              onMouseEnter={onPieEnter}
            >
              {chartData.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
              {showDataLabels && !showLabels && (
                <LabelList dataKey={dataKey} position="outside" style={{ fill: "#333", fontSize: 10 }} />
              )}
            </Pie>
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && (
              <Legend
                wrapperStyle={{ color: themeStyles.textColor }}
                layout={legendPosition === "left" || legendPosition === "right" ? "vertical" : "horizontal"}
                align={legendPosition === "right" ? "right" : legendPosition === "left" ? "left" : "center"}
                verticalAlign={legendPosition === "bottom" ? "bottom" : legendPosition === "top" ? "top" : "middle"}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
      )}

      {type === "area-chart" && (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }} {...getAnimationProps()}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={themeStyles.gridColor} />}
            {showXAxis && <XAxis dataKey={xAxisKey} tick={{ fill: themeStyles.textColor }} />}
            {showYAxis && <YAxis tick={{ fill: themeStyles.textColor }} scale={getScaleType()} />}
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && (
              <Legend
                wrapperStyle={{ color: themeStyles.textColor }}
                layout={legendPosition === "left" || legendPosition === "right" ? "vertical" : "horizontal"}
                align={legendPosition === "right" ? "right" : legendPosition === "left" ? "left" : "center"}
                verticalAlign={legendPosition === "bottom" ? "bottom" : legendPosition === "top" ? "top" : "middle"}
              />
            )}
            {dataKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stackId={areaChartType === "stacked" || areaChartType === "percent" ? "1" : undefined}
                stroke={colors[index % colors.length]}
                fill={`${colors[index % colors.length]}${Math.round(fillOpacity * 255)
                  .toString(16)
                  .padStart(2, "0")}`}
                name={key}
              >
                {showDataLabels && <LabelList dataKey={key} position="top" style={{ fill: "#333", fontSize: 10 }} />}
              </Area>
            ))}
            {showReferenceLine && (
              <ReferenceLine
                y={referenceLineValue}
                label={referenceLineLabel || undefined}
                stroke={referenceLineColor}
                strokeDasharray={
                  referenceLineStroke === "dashed" ? "3 3" : referenceLineStroke === "dotted" ? "1 3" : undefined
                }
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      )}

      {type === "scatter-chart" && (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }} {...getAnimationProps()}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={themeStyles.gridColor} />}
            {showXAxis && (
              <XAxis type="number" dataKey="x" name="x" tick={{ fill: themeStyles.textColor }} scale={getScaleType()} />
            )}
            {showYAxis && (
              <YAxis type="number" dataKey="y" name="y" tick={{ fill: themeStyles.textColor }} scale={getScaleType()} />
            )}
            <ZAxis type="number" dataKey="z" range={[60, 400]} name="z" />
            {showTooltip && <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />}
            {showLegend && (
              <Legend
                wrapperStyle={{ color: themeStyles.textColor }}
                layout={legendPosition === "left" || legendPosition === "right" ? "vertical" : "horizontal"}
                align={legendPosition === "right" ? "right" : legendPosition === "left" ? "left" : "center"}
                verticalAlign={legendPosition === "bottom" ? "bottom" : legendPosition === "top" ? "top" : "middle"}
              />
            )}
            <Scatter name="Values" data={chartData} fill={colors[0]}>
              {showDataLabels && <LabelList dataKey="name" position="top" style={{ fill: "#333", fontSize: 10 }} />}
            </Scatter>
            {showTrendline && (
              <Line
                type="monotone"
                dataKey="y"
                stroke={colors[1] || "#ff7300"}
                dot={false}
                activeDot={false}
                legendType="none"
              />
            )}
          </ScatterChart>
        </ResponsiveContainer>
      )}

      {type === "radar-chart" && (
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData} {...getAnimationProps()}>
            <PolarGrid gridCount={radarGridCount} />
            <PolarAngleAxis dataKey={xAxisKey} tick={{ fill: themeStyles.textColor }} />
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
            {showLegend && (
              <Legend
                wrapperStyle={{ color: themeStyles.textColor }}
                layout={legendPosition === "left" || legendPosition === "right" ? "vertical" : "horizontal"}
                align={legendPosition === "right" ? "right" : legendPosition === "left" ? "left" : "center"}
                verticalAlign={legendPosition === "bottom" ? "bottom" : legendPosition === "top" ? "top" : "middle"}
              />
            )}
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
          </RadarChart>
        </ResponsiveContainer>
      )}

      {type === "radial-bar-chart" && (
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="10%"
            outerRadius="80%"
            barSize={radialBarSize}
            data={chartData}
            startAngle={radialStartAngle}
            endAngle={radialEndAngle}
            {...getAnimationProps()}
          >
            {radialBarBackground && <RadialBar background />}
            <RadialBar minAngle={15} label={{ position: "insideStart", fill: "#fff" }} background dataKey={valueKey}>
              {chartData.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
              {showDataLabels && (
                <LabelList dataKey={xAxisKey} position="inside" style={{ fill: "#fff", fontSize: 10 }} />
              )}
            </RadialBar>
            {showLegend && (
              <Legend
                wrapperStyle={{ color: themeStyles.textColor }}
                layout={legendPosition === "left" || legendPosition === "right" ? "vertical" : "horizontal"}
                align={legendPosition === "right" ? "right" : legendPosition === "left" ? "left" : "center"}
                verticalAlign={legendPosition === "bottom" ? "bottom" : legendPosition === "top" ? "top" : "middle"}
                formatter={(value, entry, index) => (
                  <span style={{ color: themeStyles.textColor }}>{entry.payload[xAxisKey]}</span>
                )}
              />
            )}
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
          </RadialBarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
