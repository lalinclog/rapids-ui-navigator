"use client"

import { useState, useRef } from "react"
import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import Sidebar from "@/components/sidebar"
import Canvas from "@/components/canvas"
import type { ChartItem } from "@/lib/types"

export default function DashboardBuilder() {
  const [items, setItems] = useState<ChartItem[]>([])
  const [viewMode, setViewMode] = useState(false)
  const nextId = useRef(1)

  const handleAddItem = (type: string) => {
    const newItem: ChartItem = {
      id: nextId.current++,
      type,
      position: { x: 20, y: 20 },
      size: { width: 300, height: 200 },
      data: generateDemoData(type),
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Chart`,
    }
    setItems([...items, newItem])
  }

  const handleMoveItem = (id: number, position: { x: number; y: number }) => {
    setItems(items.map((item) => (item.id === id ? { ...item, position } : item)))
  }

  const handleResizeItem = (id: number, size: { width: number; height: number }) => {
    setItems(items.map((item) => (item.id === id ? { ...item, size } : item)))
  }

  const handleUpdateItem = (id: number, updates: Partial<ChartItem>) => {
    setItems(items.map((item) => (item.id === id ? { ...item, ...updates } : item)))
  }

  const handleDeleteItem = (id: number) => {
    setItems(items.filter((item) => item.id !== id))
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-screen">
        {!viewMode && <Sidebar onAddItem={handleAddItem} />}
        <Canvas
          items={items}
          viewMode={viewMode}
          onMoveItem={handleMoveItem}
          onResizeItem={handleResizeItem}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          onToggleViewMode={() => setViewMode(!viewMode)}
        />
      </div>
    </DndProvider>
  )
}

function generateDemoData(type: string) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]

  if (type === "bar" || type === "line") {
    return months.map((month) => ({
      name: month,
      value: Math.floor(Math.random() * 1000),
    }))
  } else if (type === "pie") {
    return [
      { name: "Group A", value: 400 },
      { name: "Group B", value: 300 },
      { name: "Group C", value: 300 },
      { name: "Group D", value: 200 },
    ]
  } else {
    return []
  }
}
