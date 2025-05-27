"use client"

import type React from "react"
import { useState, useCallback, useEffect, useRef } from "react"
import type { DashboardItem as DashboardItemType } from "@/lib/types"
import DashboardItem from "@/components/dashboard-item"
import { generateMockData } from "@/utils/mock-data"
import { useToast } from "@/components/ui/use-toast"
import { nanoid } from "nanoid"
import { motion, AnimatePresence } from "framer-motion"



interface DashboardCanvasProps {
  items: DashboardItemType[]
  onItemsChange: (items: DashboardItemType[]) => void
  editMode: boolean
  selectedItemId: string | null
  onSelectItem: (id: string) => void
  onOpenItemSettings: (id: string) => void
  width: number
  height: number
  getFilteredData?: (item: DashboardItemType) => any
  onFilterApply?: (filterId: string, filterValue: any) => void
}

const DashboardCanvas = ({
  items,
  onItemsChange,
  editMode,
  selectedItemId,
  onSelectItem,
  onOpenItemSettings,
  width,
  height,
  getFilteredData,
  onFilterApply,
}: DashboardCanvasProps) => {
  const { toast } = useToast()
  const [nextZIndex, setNextZIndex] = useState<number>(10)
  const pendingItemRemoval = useRef<string | null>(null)
  const [dropIndicator, setDropIndicator] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  })
  const nextChartId = useRef<number>(1) 

  // Update nextZIndex when items change
  useEffect(() => {
    if (items.length > 0) {
      const maxZIndex = Math.max(...items.map((item) => item.zIndex || 0))
      if (maxZIndex + 1 !== nextZIndex) {
        setNextZIndex(maxZIndex + 1)
      }
    }
  }, [items, nextZIndex])

  // Handle pending item removal
  useEffect(() => {
    if (pendingItemRemoval.current && pendingItemRemoval.current === selectedItemId) {
      onSelectItem("")
      pendingItemRemoval.current = null
    }
  }, [items, selectedItemId, onSelectItem])

  // Add keyboard shortcut for canvas-level operations
  useEffect(() => {
    if (!editMode) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Add more keyboard shortcuts here as needed
      if (e.key === "Escape") {
        // Deselect current item
        onSelectItem("")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [editMode, onSelectItem])

  const checkCollision = useCallback(
    (newItem: DashboardItemType, excludeId?: string) => {
      // Calculate the newItem's boundaries
      const a = {
        x1: newItem.x,
        y1: newItem.y,
        x2: newItem.x + newItem.width,
        y2: newItem.y + newItem.height,
      }

      // Check against all other items (except the one being moved)
      return items.some((item) => {
        if (item.id === excludeId) return false

        // Calculate the existing item's boundaries
        const b = {
          x1: item.x,
          y1: item.y,
          x2: item.x + item.width,
          y2: item.y + item.height,
        }

        // Only add 1px padding between items
        return !(a.x1 >= b.x2 + 1 || a.x2 + 1 <= b.x1 || a.y1 >= b.y2 + 1 || a.y2 + 1 <= b.y1)
      })
    },
    [items],
  )

  // Find the next available position for an item
  const findNextAvailablePosition = useCallback(
    (item: DashboardItemType, excludeId?: string): { x: number; y: number } => {
      // Start with the original position
      let testItem = { ...item }

      // Grid size for snapping
      const gridSize = 20

      // Try positions in a spiral pattern starting from the original position
      const maxAttempts = 100 // Prevent infinite loops
      let attempt = 0

      // Try moving right first
      while (checkCollision(testItem, excludeId) && attempt < maxAttempts) {
        attempt++

        // Try moving right
        testItem = {
          ...testItem,
          x: testItem.x + gridSize,
        }

        // If we're getting too close to the right edge, move down and reset x
        if (testItem.x + testItem.width > width - gridSize) {
          testItem.x = 0
          testItem.y += gridSize
        }

        // If we're getting too close to the bottom edge, start from the top again
        if (testItem.y + testItem.height > height - gridSize) {
          testItem.y = 0
        }
      }

      return { x: testItem.x, y: testItem.y }
    },
    [checkCollision, width, height],
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()

      // Show drop indicator
      if (editMode) {
        const canvas = e.currentTarget.getBoundingClientRect()
        const x = Math.round((e.clientX - canvas.left) / 10) * 10
        const y = Math.round((e.clientY - canvas.top) / 10) * 10

        setDropIndicator({
          x,
          y,
          visible: true,
        })
      }
    },
    [editMode],
  )

  const handleDragLeave = useCallback(() => {
    setDropIndicator({ x: 0, y: 0, visible: false })
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDropIndicator({ x: 0, y: 0, visible: false })

      const itemType = e.dataTransfer.getData("itemType")
      console.log("CANVAS - Dropped item:", { itemType })
      if (!itemType) return

      // Get element's position relative to the canvas
      const canvas = e.currentTarget.getBoundingClientRect()
      const x = Math.round((e.clientX - canvas.left) / 10) * 10
      const y = Math.round((e.clientY - canvas.top) / 10) * 10

      let width = 200
      let height = 200
      let content
      let config

      // Set default sizes and configs based on item type
      switch (itemType) {
        case "text":
          width = 200
          height = 100
          content = "Double click to edit this text"
          break
        case "image":
          width = 200
          height = 200
          content = "https://via.placeholder.com/200x200"
          break
        case "filter":
          width = 250
          height = 100
          content = { selectedValues: [] }
          config = {
            filterType: "select",
            filterField: "category",
            targetCharts: "all",
            title: "Filter by Category",
            multiSelect: true,
          }
          break
        case "tabs":
          width = 600
          height = 400
          content = {
            tabs: [
              { id: "tab-1", title: "Dashboard", content: "Dashboard content goes here" },
              { id: "tab-2", title: "Activity", content: "Activity content goes here" },
              { id: "tab-3", title: "Overview", content: "Overview content goes here" },
            ],
          }
          config = {
            title: "Navigation Tabs",
            orientation: "horizontal",
            variant: "default",
            size: "default",
            showAddButton: true,
            tabsPosition: "top",
          }
          break
        // Standardize chart type names to match what the chart component expects
        case "bar-chart":
        case "barChart":
          width = 300
          height = 250
          content = generateMockData("bar-chart")
          config = {
            title: "Bar Chart",
            showLegend: true,
            legendPosition: "right",
            colors: ["#38bdf8", "#818cf8", "#fb7185", "#34d399", "#fbbf24"],
            theme: "light",
            showGrid: true,
            labelKey: "name",
            valueKey: "value",
          }
          break
        case "line-chart":
        case "lineChart":
          width = 300
          height = 250
          content = generateMockData("line-chart")
          config = {
            title: "Line Chart",
            showLegend: true,
            legendPosition: "right",
            colors: ["#38bdf8", "#818cf8", "#fb7185", "#34d399", "#fbbf24"],
            theme: "light",
            showGrid: true,
            labelKey: "name",
            valueKey: "value",
            lineChartType: "linear", // Add default line chart type
          }
          break
        case "pie-chart":
        case "pieChart":
          width = 300
          height = 250
          content = generateMockData("pie-chart")
          config = {
            title: "Pie Chart",
            showLegend: true,
            legendPosition: "right",
            colors: ["#38bdf8", "#818cf8", "#fb7185", "#34d399", "#fbbf24"],
            theme: "light",
            labelKey: "name",
            valueKey: "value",
          }
          break
        case "area-chart":
        case "areaChart":
          width = 300
          height = 250
          content = generateMockData("area-chart")
          config = {
            title: "Area Chart",
            showLegend: true,
            legendPosition: "right",
            colors: ["#38bdf8", "#818cf8", "#fb7185", "#34d399", "#fbbf24"],
            theme: "light",
            showGrid: true,
            labelKey: "name",
            valueKey: "value",
          }
          break
        case "scatter-chart":
        case "scatterChart":
          width = 300
          height = 250
          content = generateMockData("scatter-chart")
          config = {
            title: "Scatter Chart",
            showLegend: true,
            legendPosition: "right",
            colors: ["#38bdf8", "#818cf8", "#fb7185", "#34d399", "#fbbf24"],
            theme: "light",
            showGrid: true,
            labelKey: "name",
            valueKey: "value",
          }
          break
        default:
          break
      }

      // Create new item
      const newItem = {
        id: nanoid(),
        chart_id: nextChartId.current++,
        type: itemType,
        x,
        y,
        width,
        height,
        content,
        config,
        zIndex: nextZIndex,
      }

      // Check for collisions before adding
      if (checkCollision(newItem)) {
        // Instead of showing an error, find the next available position
        const newPosition = findNextAvailablePosition(newItem)
        newItem.x = newPosition.x
        newItem.y = newPosition.y

        // Notify the user that the item was automatically repositioned
        toast({
          title: "Item repositioned",
          description: "The item was automatically placed in the next available space.",
        })
      }

      // First update items
      onItemsChange([...items, newItem])

      // Then schedule selection for the next tick
      setTimeout(() => {
        onSelectItem(newItem.id)
      }, 0)

      setNextZIndex((prevZIndex) => prevZIndex + 1)
    },
    [items, nextZIndex, toast, onItemsChange, onSelectItem, checkCollision, findNextAvailablePosition],
  )

  const updateItemPosition = useCallback(
    (id: string, x: number, y: number) => {
      onItemsChange(items.map((item) => (item.id === id ? { ...item, x, y } : item)))
    },
    [items, onItemsChange],
  )

  const updateItemSize = useCallback(
    (id: string, width: number, height: number) => {
      onItemsChange(items.map((item) => (item.id === id ? { ...item, width, height } : item)))
    },
    [items, onItemsChange],
  )

  const updateItemContent = useCallback(
    (id: string, content: any) => {
      onItemsChange(items.map((item) => (item.id === id ? { ...item, content } : item)))
    },
    [items, onItemsChange],
  )

  const updateItemConfig = useCallback(
    (id: string, config: any) => {
      onItemsChange(items.map((item) => (item.id === id ? { ...item, config: { ...item.config, ...config } } : item)))
    },
    [items, onItemsChange],
  )

  const removeItem = useCallback(
    (id: string) => {
      // Mark this item for removal and handle selection change in the effect
      if (id === selectedItemId) {
        pendingItemRemoval.current = id
      }

      onItemsChange(items.filter((item) => item.id !== id))

      toast({
        title: "Item deleted",
        description: "The item has been removed from the dashboard.",
      })
    },
    [items, onItemsChange, selectedItemId, toast],
  )

  const duplicateItem = useCallback(
    (id: string) => {
      const itemToDuplicate = items.find((item) => item.id === id)
      if (!itemToDuplicate) return

      const newItem = {
        ...JSON.parse(JSON.stringify(itemToDuplicate)), // Deep clone
        id: nanoid(),
        x: itemToDuplicate.x + 20, // Offset slightly
        y: itemToDuplicate.y + 20,
        zIndex: nextZIndex,
      }

      // Check for collisions before adding
      if (checkCollision(newItem)) {
        // Find the next available position instead of showing an error
        const newPosition = findNextAvailablePosition(newItem)
        newItem.x = newPosition.x
        newItem.y = newPosition.y

        toast({
          title: "Item duplicated",
          description: "The item was duplicated and placed in the next available space.",
        })
      } else {
        toast({
          title: "Item duplicated",
          description: "A copy of the item has been created.",
        })
      }

      // First update items
      onItemsChange([...items, newItem])

      // Then schedule selection for the next tick
      setTimeout(() => {
        onSelectItem(newItem.id)
      }, 0)

      setNextZIndex((prevZIndex) => prevZIndex + 1)
    },
    [items, nextZIndex, onItemsChange, onSelectItem, checkCollision, findNextAvailablePosition, toast],
  )

  const handleItemDrag = useCallback(
    (id: string, dx: number, dy: number) => {
      const currentItemIndex = items.findIndex((item) => item.id === id)
      if (currentItemIndex === -1) return

      const currentItem = items[currentItemIndex]

      // Calculate new position (allow any position, including negative)
      const newX = currentItem.x + dx
      const newY = currentItem.y + dy

      // Create a temporary item to check for collisions
      const tempItem = {
        ...currentItem,
        x: newX,
        y: newY,
      }

      if (checkCollision(tempItem, id)) {
        // Find the next available position
        const newPosition = findNextAvailablePosition(tempItem, id)

        // Only update if the position is different from the current one
        if (newPosition.x !== currentItem.x || newPosition.y !== currentItem.y) {
          updateItemPosition(id, newPosition.x, newPosition.y)

          // Subtle notification that the item was repositioned
          toast({
            title: "Item repositioned",
            description: "The item was moved to the next available space.",
            duration: 2000, // Shorter duration for less disruption
          })
        }
        return
      }

      updateItemPosition(id, newX, newY)
    },
    [items, updateItemPosition, checkCollision, findNextAvailablePosition, toast],
  )

  const handleItemResize = useCallback(
    (id: string, width: number, height: number) => {
      const currentItemIndex = items.findIndex((item) => item.id === id)
      if (currentItemIndex === -1) return

      const currentItem = items[currentItemIndex]

      // Create a temporary item with new dimensions to check for collisions
      const tempItem = {
        ...currentItem,
        width,
        height,
      }

      if (checkCollision(tempItem, id)) {
        // Find the next available position for the resized item
        const newPosition = findNextAvailablePosition(tempItem, id)

        // Update both size and position
        onItemsChange(
          items.map((item) => (item.id === id ? { ...item, width, height, x: newPosition.x, y: newPosition.y } : item)),
        )

        toast({
          title: "Item repositioned",
          description: "The resized item was moved to avoid overlapping.",
          duration: 2000,
        })

        return
      }

      updateItemSize(id, width, height)
    },
    [items, updateItemSize, checkCollision, findNextAvailablePosition, onItemsChange, toast],
  )

  const bringToFront = useCallback(
    (id: string) => {
      setNextZIndex((prevZIndex) => {
        const newZIndex = prevZIndex + 1
        onItemsChange(items.map((item) => (item.id === id ? { ...item, zIndex: newZIndex } : item)))
        return newZIndex
      })
    },
    [items, onItemsChange],
  )

  // Handle canvas click to deselect items
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      // Only deselect if clicking directly on the canvas, not on an item
      if (e.target === e.currentTarget && selectedItemId) {
        // Use setTimeout to defer the state update to the next tick
        setTimeout(() => {
          onSelectItem("")
        }, 0)
      }
    },
    [selectedItemId, onSelectItem],
  )

  const handleSelectItem = useCallback(
    (id: string) => {
      // Use setTimeout to defer the state update to the next tick
      setTimeout(() => {
        onSelectItem(id)
      }, 0)
    },
    [onSelectItem],
  )

  const handleOpenItemSettings = useCallback(
    (id: string) => {
      // Use setTimeout to defer the state update to the next tick
      setTimeout(() => {
        onOpenItemSettings(id)
      }, 0)
    },
    [onOpenItemSettings],
  )

  const handleFilterApply = useCallback(
    (filterId: string, filterValue: any) => {
      if (onFilterApply) {
        onFilterApply(filterId, filterValue)
      }
    },
    [onFilterApply],
  )

  return (
    <div className="mb-6">
      <div
        className="rounded-lg bg-background/30 backdrop-blur-sm shadow-lg h-[calc(100vh-180px)] relative overflow-auto dashboard-canvas"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleCanvasClick}
      >
        <div
          className={`absolute ${editMode ? "bg-grid-pattern" : ""}`}
          style={{ width: `${width}px`, height: `${height}px` }}
        >
          {/* Drop indicator */}
          {dropIndicator.visible && editMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute border-2 border-dashed border-primary rounded-md pointer-events-none"
              style={{
                left: dropIndicator.x,
                top: dropIndicator.y,
                width: 200,
                height: 150,
                zIndex: 9999,
              }}
            />
          )}

          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                style={{ position: "absolute", width: "100%", height: "100%", pointerEvents: "none" }}
              >
                <DashboardItem
                  key={item.id}
                  item={item}
                  isActive={selectedItemId === item.id}
                  editable={editMode}
                  onSelect={() => {
                    if (editMode) {
                      handleSelectItem(item.id)
                      bringToFront(item.id)
                    }
                  }}
                  onOpenSettings={() => {
                    if (editMode) {
                      handleOpenItemSettings(item.id)
                    }
                  }}
                  onDrag={handleItemDrag}
                  onResize={handleItemResize}
                  onContentChange={updateItemContent}
                  onConfigChange={updateItemConfig}
                  onRemove={removeItem}
                  onDuplicate={duplicateItem}
                  onFilterApply={handleFilterApply}
                  dashboardItems={items}
                  getFilteredData={getFilteredData}
                  onClose={() => { console.log("Item closed") }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {items.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground h-[calc(100vh-200px)] overflow-hidden">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center p-8 rounded-lg bg-background/50 backdrop-blur-sm border border-border/30"
            >
              <p className="text-lg font-medium mb-2">Your canvas is empty</p>
              <p className="text-sm">Drag and drop items from the sidebar to create your dashboard</p>
              <p className="text-xs mt-2 text-muted-foreground">or import an existing dashboard configuration</p>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardCanvas
