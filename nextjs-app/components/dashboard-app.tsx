// components/dashboard-app/page.tsx

"use client"

import { useState, useEffect, useCallback } from "react"
import { Responsive as ResponsiveGridLayout, WidthProvider, type Layouts } from "react-grid-layout"
import { v4 as uuidv4 } from "uuid"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Dashboard, DashboardItem } from "@/lib/types"


import { useRouter } from "next/navigation"
import Sidebar from "@/components/sidebar"
import DashboardCanvas from "@/components/dashboard-canvas"
import DashboardHeader from "@/components/dashboard-header"
import SettingsSidebar from "@/components/settings-sidebar"
import { useToast } from "@/components/ui/use-toast"
import DashboardSettings from "@/components/dashboard-settings"
import DashboardInfo from "@/components/dashboard-info"
import PagesManager, { type DashboardPage } from "@/components/pages-manager"
import { CommandMenu } from "@/components/command-menu"
import { ThemeProvider } from "@/components/theme-provider"
import { useTheme } from "next-themes"
import { useAuth } from "@/components/auth/auth-context"
import type { FilterType } from "@/components/types/filter"
import { useDashboardStore } from "@/components/store/dashboard-store"
import debounce from "lodash.debounce"
import isEqual from "lodash.isequal"

const ResponsiveGrid = WidthProvider(ResponsiveGridLayout)

interface DashboardAppProps {
  items: DashboardItem[]
  dashboard?: Dashboard
  onChange?: (data: {
    items: DashboardItem[]
    globalFilters: FilterType[]
    dimensions: { width: number; height: number }
  }) => void
  readOnly?: boolean
  globalFilters?: FilterType[]
  dashboardWidth?: number
  dashboardHeight?: number
  initialData?: any
}

export default function DashboardApp({
  items = [],
  dashboard,
  onChange,
  readOnly = true,
  globalFilters: initialGlobalFilters = [],
  dashboardWidth: initialDashboardWidth = 1200,
  dashboardHeight: initialDashboardHeight = 800,
  initialData
}: DashboardAppProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const { toast } = useToast()
  const router = useRouter()
  const { theme } = useTheme()
  const { authState, logout } = useAuth()
  const [dashboardItems, setDashboardItems] = useState<DashboardItem[]>(items || [])
  const [layouts, setLayouts] = useState<Layouts>({})
  const [activeFilters, setActiveFilters] = useState<FilterType[]>(initialGlobalFilters || [])
  const [dashboardWidth, setDashboardWidth] = useState<number>(initialDashboardWidth || 1200)
  const [dashboardHeight, setDashboardHeight] = useState<number>(initialDashboardHeight || 800)
  const [dashboardTitle, setDashboardTitle] = useState("My Analytics Dashboard")
  const [editMode, setEditMode] = useState(true)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [showSettingsSidebar, setShowSettingsSidebar] = useState(false)
  const [commandMenuOpen, setCommandMenuOpen] = useState(false)
  // Track the last sent payload to avoid duplicate syncs
  const [lastSyncedData, setLastSyncedData] = useState<any>(null)

  // Debounced sync function
  const debouncedSyncToParent = useCallback(
    debounce((newData: any) => {
      if (!onChange) return
      if (!isEqual(newData, lastSyncedData)) {
        setLastSyncedData(newData)
        onChange(newData)
      }
    }, 300),
    [onChange, lastSyncedData]
  )


  // Add dashboard dimensions state
  //const [dashboardWidth, setDashboardWidth] = useState(2000)
  //const [dashboardHeight, setDashboardHeight] = useState(2000)

  // Add active filters state
  //const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})

  // Add dashboard pages state
  const [dashboardPages, setDashboardPages] = useState<DashboardPage[]>([
    { id: "main", title: "Main Dashboard", isDefault: true },
  ])
  const [currentPageId, setCurrentPageId] = useState("main")

  // Add these state variables at the top of the component with the other state declarations
  const [tabsPosition, setTabsPosition] = useState<"top" | "bottom">("top")
  const [tabsSize, setTabsSize] = useState<"small" | "default" | "large">("default")

  // Get the selected item
  const selectedItem = dashboardItems.find((item) => item.id === selectedItemId) || null

  useEffect(() => {
    setDashboardItems(items)
  }, [items])

  useEffect(() => {
    setActiveFilters(initialGlobalFilters)
  }, [initialGlobalFilters])

  useEffect(() => {
    setDashboardWidth(initialDashboardWidth)
  }, [initialDashboardWidth])

  useEffect(() => {
    setDashboardHeight(initialDashboardHeight)
  }, [initialDashboardHeight])

  useEffect(() => {
    if (!readOnly && onChange) {
      const payload = {
        items: dashboardItems,
        globalFilters: activeFilters,
        dimensions: { width: dashboardWidth, height: dashboardHeight },
      }
      debouncedSyncToParent(payload)
    }
  }, [dashboardItems, activeFilters, dashboardWidth, dashboardHeight, onChange, readOnly])

  useEffect(() => {
    return () => {
      debouncedSyncToParent.cancel()
    }
  }, [debouncedSyncToParent])

  const handleLayoutChange = (newLayouts: Layouts) => {
    setLayouts(newLayouts)
  }

  // Effect to close settings sidebar when no item is selected
  useEffect(() => {
    if (!selectedItemId && showSettingsSidebar) {
      setShowSettingsSidebar(false)
    }
  }, [selectedItemId, showSettingsSidebar])

  // Add keyboard shortcut for command menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setCommandMenuOpen(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Handle importing dashboard configuration
  const handleImport = useCallback(
    (importedData: any) => {
      try {
        if (!importedData.items || !Array.isArray(importedData.items)) {
          throw new Error("Invalid dashboard data format")
        }

        setDashboardItems(importedData.items)
        if (importedData.title) {
          setDashboardTitle(importedData.title)
        }

        // Import pages if available
        if (importedData.pages && Array.isArray(importedData.pages)) {
          setDashboardPages(importedData.pages)
          // Set current page to the default page or the first page
          const defaultPage = importedData.pages.find((page: DashboardPage) => page.isDefault) || importedData.pages[0]
          if (defaultPage) {
            setCurrentPageId(defaultPage.id)
          }
        }

        toast({
          title: "Dashboard imported",
          description: "Your dashboard has been successfully imported.",
        })
      } catch (error) {
        toast({
          title: "Import failed",
          description: error instanceof Error ? error.message : "Failed to import dashboard data.",
          variant: "destructive",
        })
      }
    },
    [toast],
  )

  // Handle exporting dashboard configuration
  const handleExport = useCallback(() => {
    const dashboardData = {
      title: dashboardTitle,
      items: dashboardItems,
      pages: dashboardPages,
      dimensions: {
        width: dashboardWidth,
        height: dashboardHeight,
      },
      exportedAt: new Date().toISOString(),
    }

    // Create a blob with the dashboard data
    const blob = new Blob([JSON.stringify(dashboardData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)

    // Create a link and trigger download
    const link = document.createElement("a")
    link.href = url
    link.download = `${dashboardTitle.replace(/\s+/g, "-").toLowerCase()}-${new Date().getTime()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Dashboard exported",
      description: "Your dashboard has been exported as a JSON file.",
    })
  }, [dashboardTitle, dashboardItems, dashboardPages, dashboardWidth, dashboardHeight, toast])

  // Handle item selection
  const handleItemSelect = useCallback((id: string) => {
    setSelectedItemId(id)
    // No longer automatically open settings sidebar
  }, [])

  // Handle opening item settings
  const handleOpenItemSettings = useCallback((id: string) => {
    setSelectedItemId(id)
    setShowSettingsSidebar(true)
  }, [])

  // Handle item content change
  const handleItemContentChange = useCallback((id: string, content: any) => {
    setDashboardItems((items) => items.map((item) => (item.id === id ? { ...item, content } : item)))
  }, [])

  // Handle item config change
  const handleItemConfigChange = useCallback((id: string, config: any) => {
    setDashboardItems((items) =>
      items.map((item) => (item.id === id ? { ...item, config: { ...item.config, ...config } } : item)),
    )
  }, [])

  // Toggle edit mode
  const toggleEditMode = useCallback(() => {
    setEditMode((prev) => {
      const newEditMode = !prev
      if (prev) {
        // When switching to view mode, close settings sidebar and clear selection
        setShowSettingsSidebar(false)
        setSelectedItemId(null)
      }
      return newEditMode
    })
  }, [])

  // Add a handler for changing dashboard dimensions
  const handleDashboardSizeChange = useCallback((width: number, height: number) => {
    setDashboardWidth(width)
    setDashboardHeight(height)
  }, [])

  // Add handlers for deleting and duplicating selected items
  const handleDeleteSelected = useCallback(() => {
    if (!selectedItemId) return

    setDashboardItems((items) => items.filter((item) => item.id !== selectedItemId))
    setSelectedItemId(null)
    setShowSettingsSidebar(false)

    toast({
      title: "Item deleted",
      description: "The item has been removed from the dashboard.",
    })
  }, [selectedItemId, toast])

  const handleDuplicateSelected = useCallback(() => {
    if (!selectedItemId) return

    const itemToDuplicate = dashboardItems.find((item) => item.id === selectedItemId)
    if (!itemToDuplicate) return

    const newItem = {
      ...JSON.parse(JSON.stringify(itemToDuplicate)), // Deep clone
      id: `item-${Date.now()}`,
      x: itemToDuplicate.x + 20, // Offset slightly
      y: itemToDuplicate.y + 20,
      zIndex: Math.max(...dashboardItems.map((item) => item.zIndex || 0)) + 1,
    }

    setDashboardItems((items) => [...items, newItem])
    setSelectedItemId(newItem.id)

    toast({
      title: "Item duplicated",
      description: "A copy of the item has been created.",
    })
  }, [selectedItemId, dashboardItems, toast])

  // Handle filter application
  const handleFilterApply = useCallback((filterId: string, filterValue: any) => {
    setActiveFilters((prev) => {
      const newFilters = prev.filter(f => f.id !== filterId)
      if (filterValue !== undefined && filterValue !== null && filterValue !== '') {
        const original = prev.find(f => f.id === filterId)

        // Reconstruct or fallback
        const updated: FilterType = {
          ...(original || {
            id: filterId,
            name: filterId,
            type: "text",
            field: filterId,
            operator: "equals",
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
          value: filterValue,
          updatedAt: new Date(),
        }

        return [...newFilters, updated]
      }
      return newFilters
    })
  }, [])

  // Get filtered data for a chart based on active filters
  const getFilteredData = useCallback(
    (item: DashboardItem) => {
      // If no active filters or item is a filter itself, return original data
      if (Object.keys(activeFilters).length === 0 || item.type === "filter") {
        return item.content
      }

      // Check if this chart should be filtered
      const shouldBeFiltered = Object.entries(activeFilters).some(([filterId, _]) => {
        const filterItem = dashboardItems.find((item) => item.id === filterId)
        if (!filterItem || !filterItem.config) return false

        // Check if this chart is targeted by the filter
        return (
          filterItem.config.targetCharts === "all" ||
          (Array.isArray(filterItem.config.targetCharts) && filterItem.config.targetCharts.includes(item.id))
        )
      })

      if (!shouldBeFiltered || !Array.isArray(item.content)) {
        return item.content
      }

      // Apply all relevant filters
      return item.content.filter((dataPoint) => {
        activeFilters.every((filter) => {
          const filterItem = dashboardItems.find((item) => item.id === filter.id)
          if (!filterItem || !filterItem.config) return true

          const { filterField, filterType } = filterItem.config
          const filterValue = filter.value

          // Skip if this filter doesn't target this chart
          if (
            filterItem.config.targetCharts !== "all" &&
            !filterItem.config.targetCharts?.includes(item.id)
          ) {
            return true
          }

          const dataValue = dataPoint[filterField]

          // Skip if the data point doesn't have the field
          if (dataValue === undefined) {
            return true
          }

          switch (filterType) {
            case "select":
              return Array.isArray(filterValue) && filterValue.includes(String(dataValue))

            case "range":
              return typeof filterValue === "number" && Number.parseFloat(dataValue) <= filterValue

            case "search":
              return (
                typeof filterValue === "string" &&
                String(dataValue).toLowerCase().includes(filterValue.toLowerCase())
              )

            case "toggle":
              return Boolean(dataValue) === Boolean(filterValue)

            default:
              return true
          }
        })

      })
    },
    [activeFilters, dashboardItems],
  )

  // Handle page change
  const handlePageChange = useCallback((pageId: string) => {
    setCurrentPageId(pageId)
    // Clear selection when changing pages
    setSelectedItemId(null)
    setShowSettingsSidebar(false)
  }, [])

  // Get items for the current page
  // In getCurrentPageItems()
  const getCurrentPageItems = useCallback(() => {
    return dashboardItems.filter(
      (item) =>
        // Show items that belong to the current page or don't have a pageId (for backward compatibility)
        item.pageId === currentPageId ||
        (!item.pageId && currentPageId === 'main') // default to 'main' if no pageId
    )
  }, [dashboardItems, currentPageId]);

  // Add these callback handlers after the other handler functions
  const handleTabsPositionChange = useCallback((position: "top" | "bottom") => {
    setTabsPosition(position)
  }, [])

  const handleTabsSizeChange = useCallback((size: "small" | "default" | "large") => {
    setTabsSize(size)
  }, [])

  // Handle command execution
  const handleCommandExecute = useCallback(
    (command: string) => {
      switch (command) {
        case "toggle-edit-mode":
          toggleEditMode()
          break
        case "export-dashboard":
          handleExport()
          break
        case "add-page":
          const newPage = {
            id: `page-${Date.now()}`,
            title: `New Page ${dashboardPages.length + 1}`,
          }
          setDashboardPages([...dashboardPages, newPage])
          break
        case "delete-selected":
          if (selectedItemId) handleDeleteSelected()
          break
        case "duplicate-selected":
          if (selectedItemId) handleDuplicateSelected()
          break
        default:
          // Handle page navigation
          if (command.startsWith("goto-page-")) {
            const pageId = command.replace("goto-page-", "")
            handlePageChange(pageId)
          }
      }
    },
    [
      toggleEditMode,
      handleExport,
      dashboardPages,
      selectedItemId,
      handleDeleteSelected,
      handleDuplicateSelected,
      handlePageChange,
    ],
  )

  // Handle user logout
  const handleLogout = async () => {
    try {
      // await logout()
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
      toast({
        title: "Logout Failed",
        description: "There was a problem logging out. Please try again.",
        variant: "destructive",
      })
    }
  }

  // This is a simplified mock implementation
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <div className={`flex h-screen overflow-hidden ${theme === "dark" ? "dark-theme" : "light-theme"}`}>
        {editMode && <Sidebar editMode={editMode} />}
        <div className="flex-1 overflow-auto flex flex-col backdrop-blur-sm bg-background/80">
          <DashboardHeader
            title={dashboardTitle}
            onTitleChange={setDashboardTitle}
            onImport={handleImport}
            onExport={handleExport}
            editMode={editMode}
            onToggleEditMode={toggleEditMode}
            onOpenCommandMenu={() => setCommandMenuOpen(true)}
          >
            {editMode && (
              <>
                <PagesManager
                  pages={dashboardPages}
                  onPagesChange={setDashboardPages}
                  currentPageId={currentPageId}
                  onPageChange={handlePageChange}
                  items={dashboardItems}
                  onItemsChange={setDashboardItems}
                />
                <DashboardSettings
                  width={dashboardWidth}
                  height={dashboardHeight}
                  tabsPosition={tabsPosition}
                  tabsSize={tabsSize}
                  onSizeChange={handleDashboardSizeChange}
                  onTabsPositionChange={setTabsPosition}
                  onTabsSizeChange={setTabsSize}
                />
              </>
            )}
          </DashboardHeader>

          {/* Render tabs at the top if that's the selected position */}
          {tabsPosition === "top" && (
            <div className="px-6 bg-transparent">
              <Tabs value={currentPageId} onValueChange={handlePageChange}>
                <TabsList
                  className={`h-10 bg-transparent border-0 p-0 ${tabsSize === "small" ? "gap-2" : tabsSize === "large" ? "gap-6" : "gap-4"
                    }`}
                >
                  {dashboardPages.map((page) => (
                    <TabsTrigger
                      key={page.id}
                      value={page.id}
                      className={`px-4 py-2 rounded-none border-0 text-muted-foreground transition-all duration-200 
                        hover:text-foreground hover:bg-accent/20
                        data-[state=active]:border-b-2 data-[state=active]:border-primary 
                        data-[state=active]:text-primary data-[state=active]:font-medium
                        ${tabsSize === "small" ? "text-sm" : tabsSize === "large" ? "text-lg" : "text-base"}`}
                    >
                      {page.title}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          )}

          <div className="flex-1 px-6 pb-6 flex flex-col">
            <DashboardCanvas
              items={getCurrentPageItems()}
              onItemsChange={(updatedItems) => {
                // Update items while preserving pageId
                setDashboardItems((prevItems) => {
                  // Find items that were updated
                  const updatedItemIds = new Set(updatedItems.map((item) => item.id))

                  // Keep items from other pages unchanged
                  const otherPageItems = prevItems.filter(
                    (item) => item.pageId && item.pageId !== currentPageId && !updatedItemIds.has(item.id),
                  )

                  // Add pageId to new items
                  const itemsWithPageId = updatedItems.map((item) => ({
                    ...item,
                    pageId: item.pageId || currentPageId,
                  }))

                  return [...otherPageItems, ...itemsWithPageId]
                })
              }}
              editMode={editMode}
              selectedItemId={selectedItemId}
              onSelectItem={handleItemSelect}
              onOpenItemSettings={handleOpenItemSettings}
              width={dashboardWidth}
              height={dashboardHeight}
              getFilteredData={getFilteredData}
              onFilterApply={handleFilterApply}
            />

            {/* Render tabs at the bottom if that's the selected position */}
            {tabsPosition === "bottom" && (
              <div className="px-6 bg-transparent mt-4">
                <Tabs value={currentPageId} onValueChange={handlePageChange}>
                  <TabsList
                    className={`h-10 bg-transparent border-0 p-0 ${tabsSize === "small" ? "gap-2" : tabsSize === "large" ? "gap-6" : "gap-4"
                      }`}
                  >
                    {dashboardPages.map((page) => (
                      <TabsTrigger
                        key={page.id}
                        value={page.id}
                        className={`px-4 py-2 rounded-none border-0 text-muted-foreground transition-all duration-200 
                          hover:text-foreground hover:bg-accent/20
                          data-[state=active]:border-t-2 data-[state=active]:border-primary 
                          data-[state=active]:text-primary data-[state=active]:font-medium
                          ${tabsSize === "small" ? "text-sm" : tabsSize === "large" ? "text-lg" : "text-base"}`}
                      >
                        {page.title}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            )}
          </div>
        </div>

        <SettingsSidebar
          selectedItem={selectedItem}
          isVisible={showSettingsSidebar && editMode}
          onContentChange={handleItemContentChange}
          onConfigChange={handleItemConfigChange}
          onClose={() => setShowSettingsSidebar(false)}
          dashboardItems={dashboardItems}
        />

        {editMode && (
          <DashboardInfo
            width={dashboardWidth}
            height={dashboardHeight}
            itemCount={getCurrentPageItems().length}
            selectedItemId={selectedItemId}
            onDeleteSelected={handleDeleteSelected}
            onDuplicateSelected={handleDuplicateSelected}
          />
        )}

        <CommandMenu
          isOpen={commandMenuOpen}
          onClose={() => setCommandMenuOpen(false)}
          onExecute={handleCommandExecute}
          pages={dashboardPages}
          currentPageId={currentPageId}
          editMode={editMode}
          hasSelectedItem={!!selectedItemId}
        />
      </div>
      {!readOnly && (
        <div className="flex justify-end">
          <Button
            onClick={() =>
              onChange &&
              onChange({
                items: dashboardItems,
                globalFilters: activeFilters,
                dimensions: { width: dashboardWidth, height: dashboardHeight },
              })
            }
          >
            Save Changes
          </Button>
        </div>
      )}
    </ThemeProvider>
  )
}
