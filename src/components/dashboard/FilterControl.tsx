// components/dashboard/FilterControl.tsx
import React, { useState, useEffect } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const FilterControl: React.FC<{
  targetItemIds: string[];
  availableFilters: string[];
  currentFilters: Record<string, any>;
  onFilterChange: (filters: Record<string, any>) => void;
}> = ({ targetItemIds, availableFilters, currentFilters, onFilterChange }) => {
  const [localFilters, setLocalFilters] = useState<Record<string, any>>(currentFilters);

  useEffect(() => {
    setLocalFilters(currentFilters);
  }, [currentFilters]);

  const handleFilterChange = (filterKey: string, value: any) => {
    const newFilters = { ...localFilters, [filterKey]: value };
    setLocalFilters(newFilters);
  };

  const applyFilters = () => {
    onFilterChange(localFilters);
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-medium">Dashboard Filters</h3>
      <div className="space-y-4">
        {availableFilters.map((filterKey) => (
          <div key={filterKey} className="space-y-2">
            <label className="text-sm font-medium">{filterKey}</label>
            <Select
              value={localFilters[filterKey] || ''}
              onValueChange={(value) => handleFilterChange(filterKey, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${filterKey}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                {/* In a real app, you would map through actual filter options */}
                <SelectItem value="option1">Option 1</SelectItem>
                <SelectItem value="option2">Option 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      <Button className="w-full" onClick={applyFilters}>
        Apply Filters
      </Button>
    </div>
  );
};