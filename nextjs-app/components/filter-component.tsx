"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"

interface FilterComponentProps {
  content: any
  config: any
  onContentChange: (content: any) => void
  onConfigChange: (config: any) => void
  dashboardItems: any[]
  onFilterApply: (filterId: string, filterValue: any) => void
}

export default function FilterComponent({
  content,
  config,
  onContentChange,
  onConfigChange,
  dashboardItems,
  onFilterApply,
}: FilterComponentProps) {
  const {
    filterType = "select",
    filterField = "",
    targetCharts = "all", // "all" or array of chart IDs
    title = "Filter",
    multiSelect = false,
    rangeMin = 0,
    rangeMax = 100,
  } = config

  const [open, setOpen] = useState(false)
  const [selectedValues, setSelectedValues] = useState<string[]>(content?.selectedValues || [])
  const [rangeValue, setRangeValue] = useState<number[]>(
    content?.rangeValue ? [content.rangeValue] : [(rangeMin + rangeMax) / 2],
  )
  const [searchValue, setSearchValue] = useState(content?.searchValue || "")
  const [toggleValue, setToggleValue] = useState(content?.toggleValue || false)

  // Extract all possible values for the filter field from all chart data
  const getFilterOptions = () => {
    const options = new Set<string>()

    dashboardItems.forEach((item) => {
      // Skip if this chart is not targeted
      if (targetCharts !== "all" && !targetCharts.includes(item.id)) return

      // Skip if the item doesn't have data
      if (!item.content || !Array.isArray(item.content)) return

      // Extract values from the data
      item.content.forEach((dataPoint: any) => {
        if (dataPoint[filterField] !== undefined) {
          options.add(String(dataPoint[filterField]))
        }
      })
    })

    return Array.from(options).sort()
  }

  const filterOptions = getFilterOptions()

  // Apply filter when values change
  useEffect(() => {
    let filterValue

    switch (filterType) {
      case "select":
        filterValue = selectedValues
        onContentChange({ ...content, selectedValues })
        break
      case "range":
        filterValue = rangeValue[0]
        onContentChange({ ...content, rangeValue: rangeValue[0] })
        break
      case "search":
        filterValue = searchValue
        onContentChange({ ...content, searchValue })
        break
      case "toggle":
        filterValue = toggleValue
        onContentChange({ ...content, toggleValue })
        break
    }

    // Notify parent component about the filter change
    onFilterApply(config.id, filterValue)
  }, [selectedValues, rangeValue, searchValue, toggleValue, config.id, onFilterApply])

  const handleSelectChange = (value: string) => {
    if (multiSelect) {
      setSelectedValues((current) =>
        current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
      )
    } else {
      setSelectedValues([value])
      setOpen(false)
    }
  }

  const handleClearSelection = () => {
    setSelectedValues([])
  }

  const renderFilterContent = () => {
    switch (filterType) {
      case "select":
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{title}</Label>
              {selectedValues.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClearSelection} className="h-6 px-2">
                  Clear
                </Button>
              )}
            </div>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                  {selectedValues.length > 0 ? (
                    <div className="flex flex-wrap gap-1 max-w-[90%] overflow-hidden">
                      {multiSelect ? (
                        selectedValues.map((value) => (
                          <Badge key={value} variant="secondary" className="mr-1">
                            {value}
                          </Badge>
                        ))
                      ) : (
                        <span>{selectedValues[0]}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Select...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search options..." />
                  <CommandList>
                    <CommandEmpty>No options found.</CommandEmpty>
                    <CommandGroup className="max-h-60 overflow-auto">
                      {filterOptions.map((option) => (
                        <CommandItem key={option} value={option} onSelect={() => handleSelectChange(option)}>
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedValues.includes(option) ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {option}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )

      case "range":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>{title}</Label>
              <span className="text-sm font-medium">{rangeValue[0]}</span>
            </div>
            <Slider value={rangeValue} min={rangeMin} max={rangeMax} step={1} onValueChange={setRangeValue} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{rangeMin}</span>
              <span>{rangeMax}</span>
            </div>
          </div>
        )

      case "search":
        return (
          <div className="space-y-2">
            <Label>{title}</Label>
            <div className="relative">
              <Input
                placeholder="Search..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pr-8"
              />
              {searchValue && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full w-8 p-0"
                  onClick={() => setSearchValue("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )

      case "toggle":
        return (
          <div className="flex items-center justify-between">
            <Label>{title}</Label>
            <Switch checked={toggleValue} onCheckedChange={setToggleValue} />
          </div>
        )

      default:
        return <div>Unsupported filter type</div>
    }
  }

  return <div className="p-2">{renderFilterContent()}</div>
}
