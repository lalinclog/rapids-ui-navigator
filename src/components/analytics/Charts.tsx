
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { BarChart2, LineChart, PieChart, AreaChart as AreaChartIcon, Plus, Eye, Trash2, Edit } from 'lucide-react';
import { 
  BarChart, LineChart as RechartsLineChart, PieChart as RechartsPieChart,
  AreaChart as RechartsAreaChart, Bar, Line, Pie, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import ChartForm from './ChartForm';
import { CHART_TYPES } from '@/pages/Analytics';

interface Chart {
  id: number;
  name: string;
  description: string | null;
  dataset_id: number;
  dataset_name: string;
  chart_type: string;
  config: Record<string, unknown>;
  dimensions: string[];
  metrics: string[];
  aggregation?: string;
  filters: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface ChartData {
  data: Array<Record<string, string | number>>;
  columns: string[];
  success: boolean;
  error?: string;
  count: number;
}

interface FormattedChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

const fetchCharts = async (): Promise<Chart[]> => {
  const response = await fetch('/api/bi/charts');
  if (!response.ok) {
    throw new Error('Failed to fetch charts');
  }
  return response.json();
};

const fetchChartData = async (chartId: number): Promise<ChartData> => {
  const response = await fetch(`/api/bi/charts/${chartId}/data`);
  if (!response.ok) {
    throw new Error(`Failed to fetch data for chart ${chartId}`);
  }
  return response.json();
};

const getChartIcon = (chartType: string) => {
  switch (chartType.toLowerCase()) {
    case CHART_TYPES.BAR:
      return <BarChart2 className="h-5 w-5" />;
    case CHART_TYPES.LINE:
      return <LineChart className="h-5 w-5" />;
    case CHART_TYPES.PIE:
      return <PieChart className="h-5 w-5" />;
    case CHART_TYPES.AREA:
      return <AreaChartIcon className="h-5 w-5" />;
    default:
      return <BarChart2 className="h-5 w-5" />;
  }
};

interface ChartCardProps {
  chart: Chart;
  onEdit: () => void;
  onView: () => void; 
  onDelete: () => void;
}

const ChartCard: React.FC<ChartCardProps> = ({ 
  chart, onEdit, onView, onDelete 
}) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{chart.name}</CardTitle>
            <CardDescription className="line-clamp-1">
              {chart.description || "No description"}
            </CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1.5">
            {getChartIcon(chart.chart_type)}
            {chart.chart_type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="text-sm mb-2">
          <span className="font-medium text-muted-foreground">Dataset:</span>{' '}
          {chart.dataset_name}
        </div>
        <div className="text-xs text-muted-foreground">
          Last updated: {new Date(chart.updated_at).toLocaleDateString()}
        </div>
      </CardContent>
      <CardFooter className="pt-2 flex justify-between">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Edit className="h-4 w-4 mr-1" /> Edit
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onView}>
            <Eye className="h-4 w-4 mr-1" /> View
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

interface ChartPreviewProps {
  chart: Chart;
}

const ChartPreview: React.FC<ChartPreviewProps> = ({ chart }) => {
  const { data: chartData, isLoading, error } = useQuery({
    queryKey: ['chartPreviewData', chart.id],
    queryFn: () => fetchChartData(chart.id),
  });

  // Format the data for recharts
  const formattedData = React.useMemo(() => {
    if (!chartData || !chartData.data || chartData.data.length === 0) {
      return [];
    }

    // Get column names
    const columns = chartData.columns || Object.keys(chartData.data[0]);
    
    // For simplicity, we'll use the first column as the name/category 
    // and a selected metric as the value
    const nameColumn = columns[0];

    // If dimensions are defined, use the first dimension as the name
    const nameKey = chart.dimensions && chart.dimensions.length > 0 
      ? chart.dimensions[0] 
      : nameColumn;
      
    // If metrics are defined, use the first metric, otherwise use the second column
    const valueColumn = chart.metrics && chart.metrics.length > 0 
      ? chart.metrics[0] 
      : columns.length > 1 ? columns[1] : null;
    
    if (!nameKey || !valueColumn) {
      return [];
    }

    return chartData.data.map(item => ({
      name: String(item[nameKey]),
      value: Number(item[valueColumn])
    })) as FormattedChartDataPoint[];
  }, [chartData, chart.metrics, chart.dimensions]);

  if (isLoading) {
    return <Skeleton className="h-[300px] w-full" />;
  }

  if (error || !chartData || !chartData.success) {
    return (
      <div className="p-4 bg-destructive/10 rounded-md text-destructive flex items-center justify-center h-[300px]">
        <p>Failed to load chart data: {error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }

  if (formattedData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-muted/50 rounded-md">
        <div className="text-muted-foreground">No data available to visualize</div>
      </div>
    );
  }

  const renderChart = () => {
      // Get chart config with defaults
      const chartConfig = {
        colors: ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE'],
        barSize: 30,
        lineWidth: 2,
        pieInnerRadius: 0,
        pieOuterRadius: 80,
        areaOpacity: 0.4,
        area: {
          strokeWidth: 2,
          opacity: 0.4,
          stack: 'expand',
          fillType: 'gradient',
        },
        showGrid: true,
        showLegend: true,
        showTooltip: true,
        xAxis: { label: chart.dimensions[0] || '' },
        yAxis: { label: '' },
        ...(chart.config || {})
      };

    switch (chart.chart_type.toLowerCase()) {
      case CHART_TYPES.BAR:
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={formattedData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
            >
              {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis 
                dataKey="name" 
                label={{ value: chartConfig.xAxis.label, position: 'bottom' }} 
              />
              <YAxis 
                label={{ value: chartConfig.yAxis.label, angle: -90, position: 'left' }} 
              />
              {chartConfig.showTooltip && <Tooltip />}
              {chartConfig.showLegend && <Legend />}
              {chart.metrics.map((metric, index) => (
                <Bar 
                  key={metric}
                  dataKey={metric}
                  fill={chartConfig.colors[index % chartConfig.colors.length]}
                  radius={[4, 4, 0, 0]}
                  barSize={chartConfig.barSize}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
        case CHART_TYPES.LINE:
          return (
            <ResponsiveContainer width="100%" height={300}>
              <RechartsLineChart 
                data={formattedData} 
                margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
              >
                {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" />}
                <XAxis 
                  dataKey="name" 
                  label={{ value: chartConfig.xAxis.label, position: 'bottom' }} 
                />
                <YAxis 
                  label={{ value: chartConfig.yAxis.label, angle: -90, position: 'left' }} 
                />
                {chartConfig.showTooltip && <Tooltip />}
                {chartConfig.showLegend && <Legend />}
                {chart.metrics.map((metric, index) => (
                  <Line 
                    key={metric}
                    type="monotone"
                    dataKey={metric}
                    stroke={chartConfig.colors[index % chartConfig.colors.length]}
                    strokeWidth={chartConfig.lineWidth}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </RechartsLineChart>
            </ResponsiveContainer>
          );
        case CHART_TYPES.AREA:
          return (
            <ResponsiveContainer width="100%" height={300}>
              <RechartsAreaChart 
                data={formattedData} 
                margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                stackOffset={chartConfig.area?.stack ? 'expand' : 'none'}
              >
                {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" />}
                <XAxis 
                  dataKey="name" 
                  label={{ value: chartConfig.xAxis.label, position: 'bottom' }} 
                />
                <YAxis 
                  label={{ value: chartConfig.yAxis.label, angle: -90, position: 'left' }} 
                />
                {chartConfig.showTooltip && <Tooltip />}
                {chartConfig.showLegend && <Legend />}
                {chart.metrics.map((metric, index) => (
                  <Area
                    key={metric}
                    type="monotone"
                    dataKey={metric}
                    stroke={chartConfig.colors[index % chartConfig.colors.length]}
                    strokeWidth={chartConfig.area?.strokeWidth || 2}
                    fillOpacity={chartConfig.area?.opacity || 0.4}
                    fill={
                      chartConfig.area?.fillType === 'gradient' 
                        ? `url(#areaGradient${index})` 
                        : chartConfig.colors[index % chartConfig.colors.length]
                    }
                    stackId={chartConfig.area?.stack ? '1' : undefined}
                  />
                ))}
                {/* Gradient definitions for area charts */}
                {chartConfig.area?.fillType === 'gradient' && (
                  <defs>
                    {chart.metrics.map((metric, index) => (
                      <linearGradient
                        key={index}
                        id={`areaGradient${index}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="5%" stopColor={chartConfig.colors[index]} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={chartConfig.colors[index]} stopOpacity={0}/>
                      </linearGradient>
                    ))}
                  </defs>
                )}
              </RechartsAreaChart>
            </ResponsiveContainer>
          );
      case CHART_TYPES.PIE:
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={formattedData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                fill="#8884d8"
                label
                innerRadius={chartConfig.pieInnerRadius}
                outerRadius={chartConfig.pieOuterRadius}
              >
                {formattedData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={chartConfig.colors[index % chartConfig.colors.length]} 
                  />
                ))}
              </Pie>
              {chartConfig.showTooltip && <Tooltip />}
              {chartConfig.showLegend && <Legend />}
            </RechartsPieChart>
          </ResponsiveContainer>
        );
      default:
        return (
          <div className="flex items-center justify-center h-[300px] bg-muted/50 rounded-md">
            <div className="text-muted-foreground">Unsupported chart type: {chart.chart_type}</div>
          </div>
        );
    }
  };

  return (
    <div className="p-4 bg-card rounded-md border">
      <h3 className="font-medium mb-4">Chart Preview</h3>
      {renderChart()}
      <div className="mt-4 text-xs text-muted-foreground">
        Displaying {formattedData.length} data points
        {chart.aggregation && <span className="ml-2">• Aggregation: {chart.aggregation}</span>}
      </div>
    </div>
  );
};

const Charts: React.FC = () => {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingChart, setEditingChart] = useState<Chart | null>(null);
  const [selectedChart, setSelectedChart] = useState<Chart | null>(null);

  const { data: charts, isLoading, error } = useQuery({
    queryKey: ['charts'],
    queryFn: fetchCharts,
  });

  const deleteChartMutation = useMutation({
    mutationFn: async (chartId: number) => {
      const response = await fetch(`/api/bi/charts/${chartId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete chart');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charts'] });
      toast({
        title: 'Chart deleted',
        description: 'Chart has been successfully deleted',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error deleting chart',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  });

  const handleCreate = () => {
    setEditingChart(null);
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (chart: Chart) => {
    setEditingChart(chart);
    setIsCreateDialogOpen(true);
  };

  const handleView = (chart: Chart) => {
    setSelectedChart(chart);
    setIsViewDialogOpen(true);
  };

  const handleDelete = (chart: Chart) => {
    if (confirm(`Are you sure you want to delete the chart "${chart.name}"?`)) {
      deleteChartMutation.mutate(chart.id);
    }
  };

  const handleFormSuccess = () => {
    setIsCreateDialogOpen(false);
    setEditingChart(null);
    queryClient.invalidateQueries({ queryKey: ['charts'] });
  };

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Charts</h2>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" /> Create Chart
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="h-full flex flex-col">
              <CardHeader>
                <Skeleton className="h-5 w-2/3 mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent className="flex-grow">
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-3 w-1/3" />
              </CardContent>
              <CardFooter className="pt-2 flex justify-between">
                <Skeleton className="h-9 w-16" />
                <Skeleton className="h-9 w-16" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded-md">
        Error loading charts: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Charts</h2>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" /> Create Chart
        </Button>
      </div>
      
      {charts && charts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {charts.map((chart) => (
            <ChartCard 
              key={chart.id} 
              chart={chart} 
              onEdit={() => handleEdit(chart)} 
              onView={() => handleView(chart)}
              onDelete={() => handleDelete(chart)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="bg-muted h-12 w-12 rounded-full flex items-center justify-center mb-4">
            <BarChart2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No Charts</h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            Create your first chart to visualize your data.
          </p>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Create Your First Chart
          </Button>
        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingChart ? 'Edit Chart' : 'Create New Chart'}</DialogTitle>
          </DialogHeader>
          <ChartForm 
            chart={editingChart ?? undefined} 
            onSuccess={handleFormSuccess}
            onCancel={() => setIsCreateDialogOpen(false)} 
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedChart?.name}</DialogTitle>
          </DialogHeader>
          {selectedChart && <ChartPreview chart={selectedChart} />}
          <div className="p-4 bg-muted rounded-md mt-4">
            <p className="font-medium mb-2">Chart Configuration:</p>
            <pre className="text-xs overflow-auto p-2 bg-background rounded border max-h-[200px]">
              {selectedChart ? JSON.stringify(selectedChart, null, 2) : ''}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Charts;
