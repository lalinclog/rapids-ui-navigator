"use client"

import type React from "react"
import {
  BarChartIcon as ChartBar,
  LineChartIcon as ChartLine,
  PieChartIcon as ChartPie,
  Edit,
  AreaChart,
  ScatterChart,
  ImageIcon,
  FilterIcon,
  RadarIcon,
  CircleDotIcon,
} from "lucide-react"

interface SidebarProps {
  editMode: boolean
}

const Sidebar: React.FC<SidebarProps> = ({ editMode }) => {
  const handleDragStart = (e: React.DragEvent, itemType: string) => {
    console.log("SIDEBAR - Dragging item:", { itemType })
    e.dataTransfer.setData("itemType", itemType)
    // Use consistent naming convention, preferably kebab-case
    // e.g., "bar-chart", "line-chart", "pie-chart"
  }

  return (
    <div className="w-64 border-r bg-white shadow-sm h-full overflow-auto transition-all duration-300">
      {editMode && (
        <div className="p-5">
          <h2 className="font-bold text-lg text-gray-900">Smart BI</h2>
          <p className="text-xs text-gray-500 mt-1">Design your analytics dashboard</p>
        </div>
      )}

      {editMode && (
        <div className="p-5">
          <h3 className="font-semibold text-sm text-gray-500 mb-3">ADD ITEMS</h3>
          <div className="space-y-3">
            <div
              className="p-3 bg-blue-50 rounded-md border border-blue-100 cursor-move flex items-center gap-2 hover:bg-blue-100 transition-colors"
              draggable
              onDragStart={(e) => handleDragStart(e, "text")}
            >
              <Edit size={18} className="text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Text</span>
            </div>

            <div
              className="p-3 bg-purple-50 rounded-md border border-purple-100 cursor-move flex items-center gap-2 hover:bg-purple-100 transition-colors"
              draggable
              onDragStart={(e) => handleDragStart(e, "image")}
            >
              <ImageIcon size={18} className="text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Image</span>
            </div>

            <div
              className="p-3 bg-amber-50 rounded-md border border-amber-100 cursor-move flex items-center gap-2 hover:bg-amber-100 transition-colors"
              draggable
              onDragStart={(e) => handleDragStart(e, "filter")}
            >
              <FilterIcon size={18} className="text-amber-600" />
              <span className="text-sm font-medium text-gray-700">Filter</span>
            </div>

            <div
              className="p-3 bg-green-50 rounded-md border border-green-100 cursor-move flex items-center gap-2 hover:bg-green-100 transition-colors"
              draggable
              onDragStart={(e) => handleDragStart(e, "bar-chart")}
            >
              <ChartBar size={18} className="text-green-600" />
              <span className="text-sm font-medium text-gray-700">Bar Chart</span>
            </div>

            <div
              className="p-3 bg-amber-50 rounded-md border border-amber-100 cursor-move flex items-center gap-2 hover:bg-amber-100 transition-colors"
              draggable
              onDragStart={(e) => handleDragStart(e, "line-chart")}
            >
              <ChartLine size={18} className="text-amber-600" />
              <span className="text-sm font-medium text-gray-700">Line Chart</span>
            </div>

            <div
              className="p-3 bg-pink-50 rounded-md border border-pink-100 cursor-move flex items-center gap-2 hover:bg-pink-100 transition-colors"
              draggable
              onDragStart={(e) => handleDragStart(e, "pie-chart")}
            >
              <ChartPie size={18} className="text-pink-600" />
              <span className="text-sm font-medium text-gray-700">Pie Chart</span>
            </div>

            <div
              className="p-3 bg-indigo-50 rounded-md border border-indigo-100 cursor-move flex items-center gap-2 hover:bg-indigo-100 transition-colors"
              draggable
              onDragStart={(e) => handleDragStart(e, "area-chart")}
            >
              <AreaChart size={18} className="text-indigo-600" />
              <span className="text-sm font-medium text-gray-700">Area Chart</span>
            </div>

            <div
              className="p-3 bg-rose-50 rounded-md border border-rose-100 cursor-move flex items-center gap-2 hover:bg-rose-100 transition-colors"
              draggable
              onDragStart={(e) => handleDragStart(e, "scatter-chart")}
            >
              <ScatterChart size={18} className="text-rose-600" />
              <span className="text-sm font-medium text-gray-700">Scatter Chart</span>
            </div>

            <div
              className="p-3 bg-cyan-50 rounded-md border border-cyan-100 cursor-move flex items-center gap-2 hover:bg-cyan-100 transition-colors"
              draggable
              onDragStart={(e) => handleDragStart(e, "radar-chart")}
            >
              <RadarIcon size={18} className="text-cyan-600" />
              <span className="text-sm font-medium text-gray-700">Radar Chart</span>
            </div>

            <div
              className="p-3 bg-emerald-50 rounded-md border border-emerald-100 cursor-move flex items-center gap-2 hover:bg-emerald-100 transition-colors"
              draggable
              onDragStart={(e) => handleDragStart(e, "radial-chart")}
            >
              <CircleDotIcon size={18} className="text-emerald-600" />
              <span className="text-sm font-medium text-gray-700">Radial Chart</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sidebar
