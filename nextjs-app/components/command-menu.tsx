"use client"

import { useEffect, useState } from "react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Edit, Eye, Download, Plus, Trash, Copy, FileText } from "lucide-react"
import type { DashboardPage } from "./pages-manager"

interface CommandMenuProps {
  isOpen: boolean
  onClose: () => void
  onExecute: (command: string) => void
  pages: DashboardPage[]
  currentPageId: string
  editMode: boolean
  hasSelectedItem: boolean
}

export function CommandMenu({
  isOpen,
  onClose,
  onExecute,
  pages,
  currentPageId,
  editMode,
  hasSelectedItem,
}: CommandMenuProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(isOpen)
  }, [isOpen])

  const handleSelect = (command: string) => {
    onExecute(command)
    setOpen(false)
    onClose()
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={(open) => {
        setOpen(open)
        if (!open) onClose()
      }}
    >
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Dashboard">
          <CommandItem onSelect={() => handleSelect("toggle-edit-mode")}>
            {editMode ? (
              <>
                <Eye className="mr-2 h-4 w-4" />
                <span>Switch to View Mode</span>
              </>
            ) : (
              <>
                <Edit className="mr-2 h-4 w-4" />
                <span>Switch to Edit Mode</span>
              </>
            )}
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("export-dashboard")}>
            <Download className="mr-2 h-4 w-4" />
            <span>Export Dashboard</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Pages">
          <CommandItem onSelect={() => handleSelect("add-page")}>
            <Plus className="mr-2 h-4 w-4" />
            <span>Add New Page</span>
          </CommandItem>

          {pages.map((page) => (
            <CommandItem
              key={page.id}
              onSelect={() => handleSelect(`goto-page-${page.id}`)}
              disabled={page.id === currentPageId}
            >
              <FileText className="mr-2 h-4 w-4" />
              <span>{page.title}</span>
              {page.id === currentPageId && <span className="ml-auto text-xs text-muted-foreground">Current</span>}
            </CommandItem>
          ))}
        </CommandGroup>

        {hasSelectedItem && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Selected Item">
              <CommandItem onSelect={() => handleSelect("duplicate-selected")}>
                <Copy className="mr-2 h-4 w-4" />
                <span>Duplicate Item</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect("delete-selected")}>
                <Trash className="mr-2 h-4 w-4" />
                <span>Delete Item</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
