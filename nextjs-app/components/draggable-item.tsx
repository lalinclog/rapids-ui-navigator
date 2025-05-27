"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useDrag } from "react-dnd"
import type { ChartItem } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Grip, X, Edit2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Import all chart components
import BarChart from "@/components/charts/bar-chart"
import LineChart from "@/components/charts/line-chart"
import PieChart from "@/components/charts/pie-chart"
import AreaChart from "@/components/charts/area-chart"
import ScatterChart from "@/components/charts/scatter-chart"
import RadarChart from "@/components/charts/radar-chart"
import RadialBarChart from "@/components/charts/radial-bar-chart"

interface DraggableItemProps {
  item: ChartItem
  viewMode: boolean
  onMoveItem: (id: number, position: { x: number; y: number }) => void
  onResizeItem: (id: number, size: { width: number; height: number }) => void
  onUpdateItem: (id: number, updates: Partial<ChartItem>) => void
  onDeleteItem: (id: number) => void
}

export default function DraggableItem({
  item,
  viewMode,
  onMoveItem,
  onResizeItem,
  onUpdateItem,
  onDeleteItem,
}: DraggableItemProps) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(item.title)
  const resizeRef = useRef<HTMLDivElement>(null)
  const startPos = useRef({ x: 0, y: 0 })
  const startSize = useRef({ width: 0, height: 0 })

  const [{ isDragging }, drag, preview] = useDrag({
    type: "chart",
    item: { ...item },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    startPos.current = { x: e.clientX, y: e.clientY }
    startSize.current = { ...item.size }

    const onMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startPos.current.x
      const dy = e.clientY - startPos.current.y

      onResizeItem(item.id, {
        width: Math.max(200, startSize.current.width + dx),
        height: Math.max(150, startSize.current.height + dy),
      })
    }

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
    }

    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseup", onMouseUp)
  }

  const handleSaveTitle = () => {
    onUpdateItem(item.id, { title })
    setEditing(false)
  }

  return (
    <div
      ref={preview}
      style={{
        position: "absolute",
        left: item.position.x,
        top: item.position.y,
        width: item.size.width,
        height: item.size.height,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <Card className="w-full h-full overflow-hidden">
        <CardHeader className="p-3 flex flex-row items-center space-y-0">
          {!viewMode && (
            <div ref={drag} className="cursor-move mr-2">
              <Grip className="h-4 w-4 text-gray-400" />
            </div>
          )}

          {editing ? (
            <div className="flex-1 flex items-center">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-7 text-sm" autoFocus />
              <Button size="sm" variant="ghost" onClick={handleSaveTitle} className="ml-2 h-7">
                Save
              </Button>
            </div>
          ) : (
            <CardTitle className="text-sm font-medium flex-1">{item.title}</CardTitle>
          )}

          {!viewMode && (
            <div className="flex items-center space-x-1">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditing(!editing)}>
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDeleteItem(item.id)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-3 pt-0 h-[calc(100%-40px)]">{renderChartContent(item)}</CardContent>

        {!viewMode && (
          <div
            ref={resizeRef}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
            onMouseDown={handleResizeStart}
            style={{
              backgroundImage: "linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.1) 50%)",
            }}
          />
        )}
      </Card>
    </div>
  )
}

function renderChartContent(item: ChartItem) {
  console.log("DRAGGABLE ITEM - Rendering chart content:", {
    type: item.type,
    data: item.data,
    config: item.config,
  })

  // Normalize chart type to handle both kebab-case and camelCase
  const normalizeChartType = (type: string) => {
    // Convert camelCase to kebab-case if needed
    if (type === "barChart") return "bar-chart"
    if (type === "lineChart") return "line-chart"
    if (type === "pieChart") return "pie-chart"
    if (type === "areaChart") return "area-chart"
    if (type === "scatterChart") return "scatter-chart"
    if (type === "radarChart") return "radar-chart"
    if (type === "radialBarChart") return "radial-bar-chart"
    return type
  }

  const chartType = normalizeChartType(item.type)
  const config = item.config || {}

  // Handle different chart types
  switch (chartType) {
    case "bar-chart":
      return (
        <BarChart
          data={item.data}
          layout={config.layout}
          colors={config.colors}
          showDataLabels={config.showDataLabels}
          barRadius={config.barRadius}
          labelKey={config.labelKey}
          valueKey={config.valueKey}
        />
      )
    case "line-chart":
      return <LineChart data={item.data} />
    case "pie-chart":
      return <PieChart data={item.data} />
    case "area-chart":
      return <AreaChart data={item.data} colors={config.colors} />
    case "scatter-chart":
      return (
        <ScatterChart
          data={item.data}
          colors={config.colors}
          showDataLabels={config.showDataLabels}
          dotSize={config.dotSize}
        />
      )
    case "radar-chart":
      return (
        <RadarChart
          data={item.data}
          colors={config.colors}
          showDataLabels={config.showDataLabels}
          radarFill={config.radarFill}
          radarOpacity={config.radarOpacity}
          radarGridCount={config.radarGridCount}
          labelKey={config.labelKey}
        />
      )
    case "radial-bar-chart":
      return (
        <RadialBarChart
          data={item.data}
          colors={config.colors}
          showDataLabels={config.showDataLabels}
          radialBarSize={config.radialBarSize}
          radialStartAngle={config.radialStartAngle}
          radialEndAngle={config.radialEndAngle}
          radialBarBackground={config.radialBarBackground}
          labelKey={config.labelKey}
          valueKey={config.valueKey}
        />
      )
    case "text":
      return <div className="h-full flex items-center justify-center text-gray-500">Double-click to edit text</div>
    case "image":
      return (
        <div className="h-full flex items-center justify-center text-gray-500 border-2 border-dashed border-gray-300 rounded-md">
          Click to upload image
        </div>
      )
    default:
      console.error("DRAGGABLE ITEM - Unknown chart type:", item.type)
      return (
        <div className="h-full flex items-center justify-center text-gray-500">
          <div className="text-center">
            <p>Unsupported chart type: {item.type}</p>
            <p className="text-xs mt-1 text-gray-400">Check console for details</p>
          </div>
        </div>
      )
  }
}
