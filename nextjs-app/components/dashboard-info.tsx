"use client"

import { useState, useEffect } from "react"
import { Info, Trash, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface DashboardInfoProps {
  width: number
  height: number
  itemCount: number
  selectedItemId?: string | null
  onDeleteSelected?: () => void
  onDuplicateSelected?: () => void
}

export default function DashboardInfo({
  width,
  height,
  itemCount,
  selectedItemId,
  onDeleteSelected,
  onDuplicateSelected,
}: DashboardInfoProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [showCoordinates, setShowCoordinates] = useState(false)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Get the canvas element
      const canvas = document.querySelector(".dashboard-canvas") as HTMLElement
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()

      // Calculate position relative to the canvas
      if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        setMousePosition({
          x: Math.round(e.clientX - rect.left),
          y: Math.round(e.clientY - rect.top),
        })
        setShowCoordinates(true)
      } else {
        setShowCoordinates(false)
      }
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  return (
    <div className="fixed bottom-4 right-4 bg-white border rounded-md shadow-md p-2 text-xs text-gray-600 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span>Dashboard Info</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                <Info className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Information about your dashboard</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="flex flex-col gap-1 mt-1">
        <div>
          Size: {width} × {height}px
        </div>
        <div>Items: {itemCount}</div>
        {showCoordinates && (
          <div>
            Position: {mousePosition.x}, {mousePosition.y}
          </div>
        )}

        {selectedItemId && (
          <div className="flex gap-1 mt-1 pt-1 border-t">
            <TooltipProvider>
              {onDuplicateSelected && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 p-0" onClick={onDuplicateSelected}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Duplicate Selected (Ctrl+D)</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {onDeleteSelected && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      onClick={onDeleteSelected}
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Delete Selected (Delete)</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          </div>
        )}
      </div>
    </div>
  )
}
