"use client"

import { useDrop } from "react-dnd"
import type { ChartItem } from "@/lib/types"
import DraggableItem from "@/components/draggable-item"
import { Button } from "@/components/ui/button"

interface CanvasProps {
  items: ChartItem[]
  viewMode: boolean
  onMoveItem: (id: number, position: { x: number; y: number }) => void
  onResizeItem: (id: number, size: { width: number; height: number }) => void
  onUpdateItem: (id: number, updates: Partial<ChartItem>) => void
  onDeleteItem: (id: number) => void
  onToggleViewMode: () => void
}

export default function Canvas({
  items,
  viewMode,
  onMoveItem,
  onResizeItem,
  onUpdateItem,
  onDeleteItem,
  onToggleViewMode,
}: CanvasProps) {
  const [, drop] = useDrop({
    accept: "chart",
    drop: (item: any, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset()
      if (delta && item.id) {
        const x = Math.round(item.position.x + delta.x)
        const y = Math.round(item.position.y + delta.y)
        onMoveItem(item.id, { x, y })
      }
    },
  })

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-500">Drag and drop items to create your custom analytics dashboard</p>
        </div>
        <Button onClick={onToggleViewMode} variant="outline" className="ml-auto">
          {viewMode ? "Edit Mode" : "View Mode"}
        </Button>
      </div>

      <div className="flex-1 relative overflow-auto p-4">
        <div
          ref={drop}
          className="w-full h-full min-h-[800px] relative bg-white border border-gray-200 rounded-lg"
          style={{
            backgroundSize: "20px 20px",
            backgroundImage:
              "linear-gradient(to right, #f0f0f0 1px, transparent 1px), linear-gradient(to bottom, #f0f0f0 1px, transparent 1px)",
          }}
        >
          <h2 className="text-xl font-semibold p-4">Dashboard</h2>

          {items.map((item) => (
            <DraggableItem
              key={item.id}
              item={item}
              viewMode={viewMode}
              onMoveItem={onMoveItem}
              onResizeItem={onResizeItem}
              onUpdateItem={onUpdateItem}
              onDeleteItem={onDeleteItem}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
