
// components/dashboard/FilterControl.tsx
import React, { useState, useEffect } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckIcon, Filter } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export interface FilterOption {
  value: string;
  label: string;
}

export const FilterControl: React.FC<{
  targetItemIds: number[];
  availableFilters: string[];
  filterOptions?: Record<string, FilterOption[]>;
  currentFilters: Record<string, any>;
  isEditing?: boolean;
  onFilterChange: (filters: Record<string, any>) => void;
  onUpdate?: (targetItemIds: number[], availableFilters: string[]) => void;
}> = ({ 
  targetItemIds, 
  availableFilters, 
  filterOptions = {}, 
  currentFilters, 
  isEditing = false, 
  onFilterChange,
  onUpdate 
}) => {
  const [localFilters, setLocalFilters] = useState<Record<string, any>>(currentFilters);
  const [localTargetIds, setLocalTargetIds] = useState<number[]>(targetItemIds);
  const [localAvailableFilters, setLocalAvailableFilters] = useState<string[]>(availableFilters);
  const [newFilterName, setNewFilterName] = useState<string>('');

  useEffect(() => {
    setLocalFilters(currentFilters);
  }, [currentFilters]);

  useEffect(() => {
    setLocalTargetIds(targetItemIds);
  }, [targetItemIds]);

  useEffect(() => {
    setLocalAvailableFilters(availableFilters);
  }, [availableFilters]);

  const handleFilterChange = (filterKey: string, value: any) => {
    const newFilters = { ...localFilters, [filterKey]: value };
    setLocalFilters(newFilters);
  };

  const applyFilters = () => {
    onFilterChange(localFilters);
    toast({
      title: "Filters Applied",
      description: "Dashboard filters have been updated"
    });
  };

  const handleAddFilter = () => {
    if (newFilterName && !localAvailableFilters.includes(newFilterName)) {
      const updatedFilters = [...localAvailableFilters, newFilterName];
      setLocalAvailableFilters(updatedFilters);
      setNewFilterName('');
      
      if (onUpdate) {
        onUpdate(localTargetIds, updatedFilters);
      }
    }
  };

  return (
    <div className="p-4 space-y-4 h-full">
      <h3 className="font-medium flex items-center gap-2">
        <Filter className="h-4 w-4" /> Dashboard Filters
      </h3>
      
      {isEditing && (
        <div className="space-y-2 border-b pb-4 mb-4">
          <label className="text-sm font-medium">Add New Filter</label>
          <div className="flex gap-2">
            <Input
              placeholder="Filter name"
              value={newFilterName}
              onChange={(e) => setNewFilterName(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleAddFilter} type="button" size="sm">
              <CheckIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4 max-h-[calc(100%-100px)] overflow-y-auto">
        {localAvailableFilters.length > 0 ? (
          localAvailableFilters.map((filterKey) => (
            <div key={filterKey} className="space-y-2">
              <label className="text-sm font-medium">{filterKey}</label>
              <Select
                value={localFilters[filterKey] || ''}
                onValueChange={(value) => handleFilterChange(filterKey, value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={`Select ${filterKey}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  {filterOptions[filterKey] ? 
                    filterOptions[filterKey].map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    )) : 
                    ['option1', 'option2', 'option3'].map(option => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
          ))
        ) : (
          <div className="text-muted-foreground text-sm text-center py-4">
            No filters available
          </div>
        )}
      </div>

      <Button 
        className="w-full"
        onClick={applyFilters}
        disabled={localAvailableFilters.length === 0}
      >
        Apply Filters
      </Button>
    </div>
  );
};

export default FilterControl;
