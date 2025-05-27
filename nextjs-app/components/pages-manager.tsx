"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PlusCircle, X, ArrowUp, ArrowDown, LayoutDashboard, Move } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import type { DashboardItem } from "@/lib/types"
import { nanoid } from "nanoid"

export interface DashboardPage {
  id: string
  title: string
  isDefault?: boolean
}

interface PagesManagerProps {
  pages: DashboardPage[]
  onPagesChange: (pages: DashboardPage[]) => void
  currentPageId: string
  onPageChange: (pageId: string) => void
  items: DashboardItem[]
  onItemsChange: (items: DashboardItem[]) => void
}

export default function PagesManager({
  pages,
  onPagesChange,
  currentPageId,
  onPageChange,
  items,
  onItemsChange,
}: PagesManagerProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [editingPageId, setEditingPageId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null)
  const [dragOverPageId, setDragOverPageId] = useState<string | null>(null)

  // Ensure there's always at least one page
  useEffect(() => {
    if (pages.length === 0) {
      const defaultPage = {
        id: nanoid(),
        title: "Main Dashboard",
        isDefault: true,
      }
      onPagesChange([defaultPage])
      onPageChange(defaultPage.id)
    }
  }, [pages, onPagesChange, onPageChange])

  const handleAddPage = () => {
    const newPage = {
      id: nanoid(),
      title: `Page ${pages.length + 1}`,
    }
    onPagesChange([...pages, newPage])
    toast({
      title: "Page added",
      description: `New page "${newPage.title}" has been created.`,
    })
  }

  const handleDeletePage = (pageId: string) => {
    // Don't allow deleting the last page
    if (pages.length <= 1) {
      toast({
        title: "Cannot delete page",
        description: "You must have at least one page in your dashboard.",
        variant: "destructive",
      })
      return
    }

    // Find items on this page
    const pageItems = items.filter((item) => item.pageId === pageId)

    // Ask for confirmation if there are items on this page
    if (pageItems.length > 0) {
      if (
        !confirm(`This page contains ${pageItems.length} items. Delete anyway? All items on this page will be deleted.`)
      ) {
        return
      }

      // Delete items on this page
      onItemsChange(items.filter((item) => item.pageId !== pageId))
    }

    // Remove the page
    const newPages = pages.filter((page) => page.id !== pageId)
    onPagesChange(newPages)

    // If the current page is being deleted, switch to another page
    if (currentPageId === pageId) {
      onPageChange(newPages[0].id)
    }

    toast({
      title: "Page deleted",
      description: "The page and all its items have been removed.",
    })
  }

  const handleEditPage = (pageId: string) => {
    const page = pages.find((p) => p.id === pageId)
    if (page) {
      setEditingPageId(pageId)
      setEditingTitle(page.title)
    }
  }

  const handleSavePageTitle = () => {
    if (!editingPageId) return

    onPagesChange(pages.map((page) => (page.id === editingPageId ? { ...page, title: editingTitle } : page)))
    setEditingPageId(null)
    setEditingTitle("")
  }

  const handleMovePageUp = (pageId: string) => {
    const pageIndex = pages.findIndex((p) => p.id === pageId)
    if (pageIndex <= 0) return

    const newPages = [...pages]
    const temp = newPages[pageIndex]
    newPages[pageIndex] = newPages[pageIndex - 1]
    newPages[pageIndex - 1] = temp
    onPagesChange(newPages)
  }

  const handleMovePageDown = (pageId: string) => {
    const pageIndex = pages.findIndex((p) => p.id === pageId)
    if (pageIndex >= pages.length - 1) return

    const newPages = [...pages]
    const temp = newPages[pageIndex]
    newPages[pageIndex] = newPages[pageIndex + 1]
    newPages[pageIndex + 1] = temp
    onPagesChange(newPages)
  }

  const handleDragStart = (e: React.DragEvent, pageId: string) => {
    setDraggedPageId(pageId)
  }

  const handleDragOver = (e: React.DragEvent, pageId: string) => {
    e.preventDefault()
    if (draggedPageId !== pageId) {
      setDragOverPageId(pageId)
    }
  }

  const handleDrop = (e: React.DragEvent, targetPageId: string) => {
    e.preventDefault()
    if (!draggedPageId || draggedPageId === targetPageId) {
      setDraggedPageId(null)
      setDragOverPageId(null)
      return
    }

    const sourceIndex = pages.findIndex((p) => p.id === draggedPageId)
    const targetIndex = pages.findIndex((p) => p.id === targetPageId)

    if (sourceIndex !== -1 && targetIndex !== -1) {
      const newPages = [...pages]
      const [movedPage] = newPages.splice(sourceIndex, 1)
      newPages.splice(targetIndex, 0, movedPage)
      onPagesChange(newPages)
    }

    setDraggedPageId(null)
    setDragOverPageId(null)
  }

  const handleDragEnd = () => {
    setDraggedPageId(null)
    setDragOverPageId(null)
  }

  const handleMoveItemsToPage = (sourcePageId: string, targetPageId: string) => {
    // Find items on the source page
    const pageItems = items.filter((item) => item.pageId === sourcePageId)

    if (pageItems.length === 0) {
      toast({
        title: "No items to move",
        description: "This page doesn't have any items to move.",
      })
      return
    }

    // Update items to the target page
    const updatedItems = items.map((item) => (item.pageId === sourcePageId ? { ...item, pageId: targetPageId } : item))

    onItemsChange(updatedItems)

    toast({
      title: "Items moved",
      description: `${pageItems.length} items moved to the selected page.`,
    })
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <LayoutDashboard className="h-4 w-4 mr-1" />
        Manage Pages
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Dashboard Pages</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <div className="flex justify-between items-center mb-4">
              <Label>Current Pages</Label>
              <Button size="sm" onClick={handleAddPage}>
                <PlusCircle className="h-4 w-4 mr-1" />
                Add Page
              </Button>
            </div>

            <div className="border rounded-md">
              {pages.map((page, index) => (
                <div
                  key={page.id}
                  className={`flex items-center p-3 ${
                    index !== pages.length - 1 ? "border-b" : ""
                  } ${dragOverPageId === page.id ? "bg-muted" : ""} ${currentPageId === page.id ? "bg-blue-50" : ""}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, page.id)}
                  onDragOver={(e) => handleDragOver(e, page.id)}
                  onDrop={(e) => handleDrop(e, page.id)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="cursor-move mr-2">
                    <Move className="h-4 w-4 text-gray-400" />
                  </div>

                  {editingPageId === page.id ? (
                    <div className="flex-1 flex items-center">
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="h-7 text-sm"
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" onClick={handleSavePageTitle} className="ml-2 h-7">
                        Save
                      </Button>
                    </div>
                  ) : (
                    <div
                      className={`flex-1 ${currentPageId === page.id ? "font-medium" : ""}`}
                      onClick={() => onPageChange(page.id)}
                    >
                      {page.title}
                      {page.isDefault && <span className="ml-2 text-xs text-muted-foreground">(Default)</span>}
                    </div>
                  )}

                  <div className="flex items-center space-x-1">
                    {pages.length > 1 && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleMovePageUp(page.id)}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleMovePageDown(page.id)}
                          disabled={index === pages.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditPage(page.id)}>
                      <span className="sr-only">Edit</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        <path d="m15 5 4 4" />
                      </svg>
                    </Button>
                    {pages.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeletePage(page.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {pages.length > 1 && (
              <div className="mt-6">
                <Label className="mb-2 block">Move Items Between Pages</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sourcePageId" className="text-xs">
                      From Page
                    </Label>
                    <select
                      id="sourcePageId"
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Select source page
                      </option>
                      {pages.map((page) => (
                        <option key={`source-${page.id}`} value={page.id}>
                          {page.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="targetPageId" className="text-xs">
                      To Page
                    </Label>
                    <select
                      id="targetPageId"
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Select target page
                      </option>
                      {pages.map((page) => (
                        <option key={`target-${page.id}`} value={page.id}>
                          {page.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    const sourceSelect = document.getElementById("sourcePageId") as HTMLSelectElement
                    const targetSelect = document.getElementById("targetPageId") as HTMLSelectElement

                    if (sourceSelect && targetSelect && sourceSelect.value && targetSelect.value) {
                      handleMoveItemsToPage(sourceSelect.value, targetSelect.value)
                    } else {
                      toast({
                        title: "Selection required",
                        description: "Please select both source and target pages.",
                        variant: "destructive",
                      })
                    }
                  }}
                >
                  Move Items
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
