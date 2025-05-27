"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { PlusCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface TabsComponentProps {
  content: any
  config: any
  onContentChange: (content: any) => void
  onConfigChange: (config: any) => void
  editable: boolean
}

export default function TabsComponent({
  content,
  config,
  onContentChange,
  onConfigChange,
  editable,
}: TabsComponentProps) {
  const {
    orientation = "horizontal",
    variant = "default",
    size = "default",
    showAddButton = true,
    tabsPosition = "top",
  } = config

  const [activeTab, setActiveTab] = useState<string>("")
  const [tabs, setTabs] = useState<Array<{ id: string; title: string; content: string }>>(
    content?.tabs || [{ id: "tab-1", title: "Tab 1", content: "Tab 1 Content" }],
  )

  // Set the first tab as active if none is selected
  useEffect(() => {
    if (tabs.length > 0 && !activeTab) {
      setActiveTab(tabs[0].id)
    }
  }, [tabs, activeTab])

  // Update content when tabs change, but only when necessary
  useEffect(() => {
    // Only update parent if the content doesn't match current tabs
    // This prevents infinite update loops
    if (JSON.stringify(content?.tabs) !== JSON.stringify(tabs)) {
      onContentChange({ tabs })
    }
  }, [tabs, onContentChange, content])

  const handleTabChange = (value: string) => {
    if (value !== activeTab) {
      setActiveTab(value)
    }
  }

  const addTab = () => {
    const newTabId = `tab-${tabs.length + 1}`
    const newTab = {
      id: newTabId,
      title: `Tab ${tabs.length + 1}`,
      content: `Content for Tab ${tabs.length + 1}`,
    }
    setTabs([...tabs, newTab])
    setActiveTab(newTabId)
  }

  const removeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (tabs.length <= 1) return

    const newTabs = tabs.filter((tab) => tab.id !== tabId)
    setTabs(newTabs)

    // If the active tab was removed, set the first tab as active
    if (activeTab === tabId && newTabs.length > 0) {
      setActiveTab(newTabs[0].id)
    }
  }

  const updateTabTitle = (tabId: string, newTitle: string) => {
    setTabs(tabs.map((tab) => (tab.id === tabId ? { ...tab, title: newTitle } : tab)))
  }

  const updateTabContent = (tabId: string, newContent: string) => {
    setTabs(tabs.map((tab) => (tab.id === tabId ? { ...tab, content: newContent } : tab)))
  }

  // Determine the class for the tabs container based on orientation and position
  const getTabsContainerClass = () => {
    if (orientation === "vertical") {
      return "flex flex-row h-full"
    }
    return "flex flex-col h-full"
  }

  // Determine the class for the tabs list based on orientation and position
  const getTabsListClass = () => {
    if (orientation === "vertical") {
      return cn(
        "flex-shrink-0 flex flex-col h-full border-r",
        size === "small" ? "w-32" : size === "large" ? "w-48" : "w-40",
      )
    }
    return cn("w-full flex-shrink-0", size === "small" ? "h-8" : size === "large" ? "h-12" : "h-10")
  }

  // Determine the class for the tabs content based on orientation
  const getTabsContentClass = () => {
    return "flex-grow overflow-auto p-4"
  }

  return (
    <div className={getTabsContainerClass()}>
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        orientation={orientation === "vertical" ? "vertical" : "horizontal"}
        className="w-full h-full flex flex-col"
      >
        <TabsList className={getTabsListClass()}>
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "relative group",
                orientation === "vertical" ? "justify-start" : "justify-center",
                size === "small" ? "text-xs py-1" : size === "large" ? "text-base py-3" : "text-sm py-2",
              )}
            >
              {editable ? (
                <input
                  type="text"
                  value={tab.title}
                  onChange={(e) => updateTabTitle(tab.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-transparent border-none focus:outline-none focus:ring-0 w-full"
                />
              ) : (
                tab.title
              )}
              {editable && tabs.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 absolute right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => removeTab(tab.id, e)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </TabsTrigger>
          ))}
          {editable && showAddButton && (
            <Button variant="ghost" size="icon" className="h-6 w-6 p-0 flex-shrink-0 self-center" onClick={addTab}>
              <PlusCircle className="h-4 w-4" />
            </Button>
          )}
        </TabsList>

        <div className={getTabsContentClass()}>
          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="h-full">
              {editable ? (
                <div className="w-full h-full border rounded-md">
                  <div
                    className="w-full h-full min-h-[200px] bg-grid-pattern"
                    data-tab-canvas={tab.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      // Get the item type from the drag event
                      const itemType = e.dataTransfer.getData("itemType")
                      if (itemType && typeof window !== "undefined") {
                        // Dispatch a custom event that the parent dashboard can listen for
                        const tabDropEvent = new CustomEvent("tab-canvas-drop", {
                          detail: {
                            tabId: tab.id,
                            itemType,
                            x: e.nativeEvent.offsetX,
                            y: e.nativeEvent.offsetY,
                          },
                        })
                        window.dispatchEvent(tabDropEvent)
                      }
                    }}
                  >
                    {tab.content && typeof tab.content === "string" ? (
                      <div className="p-4 text-gray-500">{tab.content}</div>
                    ) : (
                      <div className="h-full w-full" id={`tab-canvas-${tab.id}`}>
                        {/* Tab items will be rendered here by the parent */}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full w-full" id={`tab-canvas-${tab.id}`}>
                  {/* Tab items will be rendered here in view mode */}
                </div>
              )}
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  )
}
