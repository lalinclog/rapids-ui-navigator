
// src/components/dashboard/DraggableDashboardItem.tsx
import React, { useEffect, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Resizable } from 'react-resizable';
import { BarChart, LineChart, PieChart, AreaChart } from 'recharts';
import { Bar, Line, Pie, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart2, LineChart as LineIcon, PieChart as PieIcon, AreaChart as AreaIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import 'react-resizable/css/styles.css';
import { motion } from 'framer-motion';

export type DashboardItemType = 
  | 'chart' 
  | 'text' 
  | 'image' 
  | 'filter' 
  | 'divider';

interface DraggableDashboardItemProps {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  children: React.ReactNode;
  onMove: (id: number, x: number, y: number) => void;
  onResize: (id: number, width: number, height: number) => void;
  onRemove: (id: number) => void;
  isEditing: boolean;
  chartType?: string;
  chartId?: number;
}

// Fallback sample data for when API requests fail
const sampleData = [
  { name: 'Jan', value: 400 },
  { name: 'Feb', value: 300 },
  { name: 'Mar', value: 600 },
  { name: 'Apr', value: 200 },
  { name: 'May', value: 500 },
  { name: 'Jun', value: 350 },
];

const pieData = [
  { name: 'Group A', value: 400 },
  { name: 'Group B', value: 300 },
  { name: 'Group C', value: 300 },
  { name: 'Group D', value: 200 },
];

interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

const fetchChartData = async (chartId: number): Promise<ChartDataPoint[]> => {
  if (!chartId) return [];
  
  try {
    const response = await fetch(`/api/bi/charts/${chartId}/data`);
    if (!response.ok) {
      throw new Error(`Failed to fetch data for chart ${chartId}: ${response.status}`);
    }
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching chart data:', error);
    throw error;
  }
};

const DraggableDashboardItem: React.FC<DraggableDashboardItemProps> = ({
  id,
  x,
  y,
  width,
  height,
  children,
  onMove,
  onResize,
  onRemove,
  isEditing,
  chartType,
  chartId,
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'DASHBOARD_ITEM',
    item: { id, x, y },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    options: {
      dropEffect: 'move',
    },
  }));

  const [, drop] = useDrop(() => ({
    accept: 'DASHBOARD_ITEM',
    drop: (item: { id: number; x: number; y: number }, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset();
      if (delta) {
        const newX = Math.max(0, x + Math.round(delta.x / 32));
        const newY = Math.max(0, y + Math.round(delta.y / 32));
        onMove(item.id, newX, newY);
      }
    },
    hover: (item, monitor) => {
      // Add hover effect
      const clientOffset = monitor.getClientOffset();
      if (clientOffset) {
        const hoverElement = document.elementFromPoint(clientOffset.x, clientOffset.y);
        if (hoverElement) {
          hoverElement.classList.add('drop-target');
          setTimeout(() => hoverElement.classList.remove('drop-target'), 300);
        }
      }
    },
  }));

  // Add touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    // Prevent scrolling when dragging
    e.preventDefault();
  };

  const handleResize = (e: any, { size }: { size: { width: number; height: number } }) => {
    onResize(id, Math.max(2, Math.round(size.width / 32)), Math.max(2, Math.round(size.height / 32)));
  };

  // Fetch real chart data from the API if a chartId is provided
  const { data: chartData, isLoading: isLoadingData, error } = useQuery({
    queryKey: ['chartData', chartId],
    queryFn: () => fetchChartData(chartId || 0),
    enabled: !!chartId,
    meta: {
    onError: (err: Error) => {
      console.error('Failed to load chart data:', err);
      toast({
        variant: 'destructive',
        title: 'Failed to load chart data',
        description: err.message || 'Unknown error occurred'
      });
    }
    }
  });
  
    // Format the data for rendering based on the structure
  const formattedData = React.useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return chartType?.toLowerCase() === 'pie' ? pieData : sampleData;
    }
  
    // Transform API data if needed
    // Here we'd adapt the data to the format required by recharts
    const hasNameProperty = chartData.some(item => 'name' in item);
    const hasValueProperty = chartData.some(item => 'value' in item);
    
    if (hasNameProperty && hasValueProperty) {
      return chartData; // Data already in the correct format
    }
    
    // If data isn't in the expected format, try to adapt it
    const keys = Object.keys(chartData[0] || {});
    if (keys.length >= 2) {
      // Use first column as name and second as value
      const nameKey = keys[0];
      const valueKey = keys[1];
      
      return chartData.map(item => ({
        name: String(item[nameKey]),
        value: Number(item[valueKey])
      }));
    }
    
    return chartType?.toLowerCase() === 'pie' ? pieData : sampleData;
  }, [chartData, chartType]);

  // Add keyboard controls for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isEditing) return;
    
    const moveAmount = e.shiftKey ? 2 : 1;
    
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        onMove(id, x, Math.max(0, y - moveAmount));
        break;
      case 'ArrowDown':
        e.preventDefault();
        onMove(id, x, y + moveAmount);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        onMove(id, Math.max(0, x - moveAmount), y);
        break;
      case 'ArrowRight':
        e.preventDefault();
        onMove(id, x + moveAmount, y);
        break;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        onRemove(id);
        break;
      default:
        break;
    }
  };


  const renderChart = () => {
    const chartWidth = width * 32 - 32; // Adjust for padding
    const chartHeight = height * 32 - 60; // Adjust for header and padding
    
    // if (!chartType || chartHeight < 50) {
    if (!chartType) {
      return (
        <div className="flex flex-col items-center justify-center h-full w-full p-4 gap-2">
          <BarChart2 className="h-8 w-8 text-muted-foreground" />
          <span className="text-muted-foreground text-sm text-center">
            Select a chart type from the sidebar
          </span>
        </div>
      );
    }

    if (isLoadingData) {
      return (
        <div className="flex flex-col items-center justify-center h-full w-full p-4 gap-2">
          <div className="animate-pulse flex space-x-4 w-full h-full">
            <div className="flex-1 space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
          <span className="text-muted-foreground text-xs">Loading chart data...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full w-full p-4">
          <span className="text-destructive text-sm">Error loading chart data</span>
          <span className="text-muted-foreground text-xs mt-1">Using sample data</span>
        </div>
      );
    }

    switch (chartType.toLowerCase()) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart>
              <Pie
                data={formattedData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                fill="#8884d8"
                label 
              />
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
        case 'area':
          return (
            <ResponsiveContainer width="100%" height={chartHeight}>
              <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="value" fill="#8884d8" stroke="#8884d8" />
              </AreaChart>
            </ResponsiveContainer>
          );
      default:
        return (
          <div className="h-full w-full flex items-center justify-center">
            {chartType === 'bar' && <BarChart2 className="h-8 w-8 text-muted-foreground" />}
            {chartType === 'line' && <LineIcon className="h-8 w-8 text-muted-foreground" />}
            {chartType === 'pie' && <PieIcon className="h-8 w-8 text-muted-foreground" />}
            {chartType === 'area' && <AreaIcon className="h-8 w-8 text-muted-foreground" />}
          </div>
        );
    }
  };

  return (
    <motion.div
      ref={(node) => drag(drop(node))}
      className="dashboard-item relative select-none"
      style={{
        gridColumnStart: x + 1,
        gridColumnEnd: x + width + 1,
        gridRowStart: y + 1,
        gridRowEnd: y + height + 1,
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ 
        opacity: isDragging ? 0.8 : 1,
        scale: isDragging ? 1.02 : 1,
        zIndex: isDragging ? 100 : 1,
      }}
      transition={{ duration: 0.15 }}
      drag={isEditing}
      dragMomentum={false}
      onTouchStart={handleTouchStart}
      tabIndex={isEditing ? 0 : -1}
      onKeyDown={handleKeyDown}
      onDragEnd={(e, info) => {
        const newX = Math.max(0, x + Math.round(info.point.x / 32));
        const newY = Math.max(0, y + Math.round(info.point.y / 32));
        onMove(id, newX, newY);
      }}
    >
      {isEditing ? (
        <Resizable
          width={width * 32}
          height={height * 32}
          onResize={handleResize}
          resizeHandles={['se']}
          minConstraints={[96, 96]}
          maxConstraints={[640, 640]} // Increased max size
          handle={(handleAxis, ref) => (
            <div
              ref={ref}
              className="resize-handle"
              style={{
                cursor: 'se-resize',
              }}
            />
          )}
        >
          <div style={{ 
            width: '100%', 
            height: '100%',
            cursor: isDragging ? 'grabbing' : 'grab' 
            }}>
            {React.cloneElement(children as React.ReactElement, {}, renderChart())}
            <div className="absolute bottom-1 right-1 w-3 h-3 bg-primary rounded-sm cursor-se-resize" />
          </div>
        </Resizable>
      ) : (
        React.cloneElement(children as React.ReactElement, {}, renderChart())
      )}
    </motion.div>
  );
};

export default DraggableDashboardItem;