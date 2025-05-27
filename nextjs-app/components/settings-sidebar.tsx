"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronRight, ChevronLeft, X } from "lucide-react"
import type { DashboardItem } from "@/lib/types"
import ItemSettings from "./item-settings"

interface SettingsSidebarProps {
  selectedItem: DashboardItem | null
  isVisible: boolean
  onContentChange: (id: string, content: any) => void
  onConfigChange: (id: string, config: any) => void
  onClose: () => void
  dashboardItems?: DashboardItem[]
}

export default function SettingsSidebar({
  selectedItem,
  isVisible,
  onContentChange,
  onConfigChange,
  onClose,
  dashboardItems = [],
}: SettingsSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  if (!isVisible || !selectedItem) return null

  return (
    <div
      className={`fixed right-0 top-0 bottom-0 bg-white border-l shadow-md transition-all duration-300 z-30 flex ${
        collapsed ? "w-12" : "w-80"
      }`}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-2 top-4 h-8 w-8"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>

      {!collapsed && (
        <div className="flex-1 p-6 overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {selectedItem.type.charAt(0).toUpperCase() + selectedItem.type.slice(1)} Settings
            </h3>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ItemSettings
            item={selectedItem}
            onContentChange={(content) => onContentChange(selectedItem.id, content)}
            onConfigChange={(config) => onConfigChange(selectedItem.id, config)}
            onClose={onClose}
            dashboardItems={dashboardItems}
          />
        </div>
      )}
    </div>
  )
}
