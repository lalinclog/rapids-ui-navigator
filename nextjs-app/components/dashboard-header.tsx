"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download, Upload, Save, PanelLeft, Edit, Eye, Command, Sun, Moon, Sparkles } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useTheme } from "next-themes"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface DashboardHeaderProps {
  title: string
  onTitleChange: (title: string) => void
  onImport: (data: any) => void
  onExport: () => void
  editMode: boolean
  onToggleEditMode: () => void
  onOpenCommandMenu?: () => void
  children?: React.ReactNode
}

export default function DashboardHeader({
  title,
  onTitleChange,
  onImport,
  onExport,
  editMode,
  onToggleEditMode,
  onOpenCommandMenu,
  children,
}: DashboardHeaderProps) {
  const { toast } = useToast()
  const { setTheme } = useTheme()
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(title)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleTitleClick = () => {
    if (!editMode) return
    setIsEditingTitle(true)
    setTitleValue(title)
  }

  const handleTitleSave = () => {
    onTitleChange(titleValue)
    setIsEditingTitle(false)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleTitleSave()
    } else if (e.key === "Escape") {
      setIsEditingTitle(false)
      setTitleValue(title)
    }
  }

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        onImport(data)
      } catch (error) {
        toast({
          title: "Import failed",
          description: "The selected file is not a valid dashboard configuration.",
          variant: "destructive",
        })
      }

      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }

    reader.readAsText(file)
  }

  return (
    <div className="p-4 flex items-center justify-between bg-background/60 backdrop-blur-md border-b border-border/40">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" className="mr-2 md:hidden">
          <PanelLeft className="h-5 w-5" />
        </Button>

        {isEditingTitle ? (
          <div className="flex items-center">
            <Input
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              className="h-9 text-xl font-bold w-[300px]"
              autoFocus
            />
            <Button variant="ghost" size="sm" onClick={handleTitleSave} className="ml-2">
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        ) : (
          <h1
            className={`text-xl font-bold ${editMode ? "cursor-pointer hover:text-primary transition-colors" : ""}`}
            onClick={handleTitleClick}
          >
            {title}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        {children}

        <div className="flex items-center gap-2">
          {onOpenCommandMenu && (
            <Button variant="outline" size="sm" onClick={onOpenCommandMenu} className="text-muted-foreground">
              <Command className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Command Menu</span>
              <kbd className="ml-1 hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun className="h-4 w-4 mr-2" />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon className="h-4 w-4 mr-2" />
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                <Sparkles className="h-4 w-4 mr-2" />
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {editMode && (
            <div className="flex items-center mr-2 border-r pr-2">
              <Button variant="ghost" size="sm" onClick={handleImportClick} className="text-muted-foreground">
                <Upload className="h-4 w-4 mr-1" />
                Import
              </Button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />

              <Button variant="ghost" size="sm" onClick={onExport} className="text-muted-foreground">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          )}

          <Button
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={onToggleEditMode}
            className={editMode ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
          >
            {editMode ? (
              <>
                <Eye className="h-4 w-4 mr-1" />
                View Mode
              </>
            ) : (
              <>
                <Edit className="h-4 w-4 mr-1" />
                Edit Mode
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
