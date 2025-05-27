
import React, { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Define form schema
const chartFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  dataset_id: z.string().min(1, "Dataset is required"),
  chart_type: z.string().min(1, "Chart type is required"),
  dimensions: z.string().optional(),
  metrics: z.string().optional(),
  config: z.string().optional(),
  aggregation: z.string().optional(),
  filters: z.string().optional(),
});

type ChartFormValues = z.infer<typeof chartFormSchema>;

interface Dataset {
  id: number;
  name: string;
  dimensions?: Array<{ name: string; field: string }>;
  metrics?: Array<{ name: string; expression: string }>;
}

interface DatasetDetail extends Dataset {
  schema: {
    fields: Array<{ name: string; type: string; description: string }>;
  };
  column_types: Record<string, string>; // Add this line
}

interface ChartFormProps {
  chart?: {
    id: number;
    name: string;
    description: string | null;
    dataset_id: number;
    chart_type: string;
    config: Record<string, unknown>;
    dimensions: string[];
    metrics: string[];
    aggregations?: string;
    filters: Record<string, unknown>;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

// Add metric interface
interface MetricConfig {
  name: string;
  field: string;
  aggregation: string;
  color?: string;
}

const CHART_TYPE_CONSTRAINTS = {
  bar: {
    minDimensions: 1,
    maxDimensions: 2,
    minMetrics: 1,
    maxMetrics: 5,
    allowedAggregations: ['sum', 'avg', 'count', 'min', 'max'],
    description: 'Bar charts require at least one dimension (category) and one metric (value).',
    defaultConfig: {
      size: 30,
      radius: [4, 4, 0, 0],
    }
  },
  line: {
    minDimensions: 1,
    maxDimensions: 1,
    minMetrics: 1,
    maxMetrics: 5,
    allowedAggregations: ['sum', 'avg', 'count', 'min', 'max'],
    description: 'Line charts work best with time dimensions and one or more metrics.',
    defaultConfig: {
      width: 2,
      dotRadius: 4,
    }
  },
  pie: {
    minDimensions: 1,
    maxDimensions: 1,
    minMetrics: 1,
    maxMetrics: 1,
    allowedAggregations: ['sum', 'count'],
    description: 'Pie charts require exactly one dimension and one metric.',
    defaultConfig: {
      innerRadius: 0,
      outerRadius: 80,
    }
  },
  area: {
    minDimensions: 1,
    maxDimensions: 1,
    minMetrics: 1,
    maxMetrics: 3,
    allowedAggregations: ['sum', 'avg'],
    description: 'Area charts work best with time dimensions and continuous metrics.',
    defaultConfig: {
      opacity: 0.4,
      strokeWidth: 2,
      fillType: 'gradient', // 'gradient' or 'solid'
      stack: false, // true for stacked area chart
    }
  },
  table: {
    minDimensions: 0,
    maxDimensions: 10,
    minMetrics: 0,
    maxMetrics: 10,
    allowedAggregations: ['sum', 'avg', 'count', 'min', 'max', 'none'],
    description: 'Tables can display multiple dimensions and metrics without restrictions.',
    defaultConfig: {}
  }
};

// Enhanced default config
const DEFAULT_CHART_CONFIG = {
  colors: ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE'],
  layout: {
    showGrid: true,
    showLegend: true,
    showTooltip: true,
    legendPosition: 'bottom',
    xAxis: {
      label: '',
      tickRotation: 0,
    },
    yAxis: {
      label: '',
      tickRotation: 0,
    },
  }
};

const fetchDatasets = async (): Promise<Dataset[]> => {
  const response = await fetch('/api/bi/datasets');
  if (!response.ok) {
    throw new Error('Failed to fetch datasets');
  }
  return response.json();
};

const fetchDatasetDetails = async (datasetId: number): Promise<DatasetDetail> => {
  const response = await fetch(`/api/bi/datasets/${datasetId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch dataset details for ID ${datasetId}`);
  }
  return response.json();
};

const ChartForm: React.FC<ChartFormProps> = ({ chart, onSuccess, onCancel }) => {
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(
    chart?.dataset_id || null
  );
  const [selectedChartType, setSelectedChartType] = useState<string>(
    chart?.chart_type || "bar"
  );
  
  const { data: datasets = [], isLoading: isLoadingDatasets } = useQuery({
    queryKey: ['datasets'],
    queryFn: fetchDatasets,
  });

  const { data: datasetDetails, isLoading: isLoadingDatasetDetails } = useQuery({
    queryKey: ['datasetDetails', selectedDatasetId],
    queryFn: () => fetchDatasetDetails(selectedDatasetId as number).then(data => {
      // Ensure column_types exists in the response
      return {
        ...data,
        column_types: data.column_types || {}
      };
    }),
    enabled: !!selectedDatasetId,
  });

  const form = useForm<ChartFormValues>({
    resolver: zodResolver(chartFormSchema),
    defaultValues: {
      name: chart?.name || "",
      description: chart?.description || "",
      dataset_id: chart?.dataset_id ? chart.dataset_id.toString() : "",
      chart_type: chart?.chart_type || "bar",
      dimensions: chart?.dimensions ? chart.dimensions.join(", ") : "",
      metrics: chart?.metrics ? JSON.stringify(
        chart.metrics.map((m, i) => ({
          name: m,
          field: m,
          aggregation: chart.config?.aggregations?.[i] || 'sum',
          color: chart.config?.colors?.[i] || DEFAULT_CHART_CONFIG.colors[i % DEFAULT_CHART_CONFIG.colors.length]
        }))
      ) : "[]",
      config: chart?.config ? JSON.stringify({
        ...DEFAULT_CHART_CONFIG,
        ...CHART_TYPE_CONSTRAINTS[chart.chart_type as keyof typeof CHART_TYPE_CONSTRAINTS]?.defaultConfig,
        ...chart.config
      }, null, 2) : JSON.stringify({
        ...DEFAULT_CHART_CONFIG,
        ...CHART_TYPE_CONSTRAINTS.bar.defaultConfig
      }, null, 2),
      filters: chart?.filters ? JSON.stringify(chart.filters, null, 2) : "{}",
    },
  });

  const chartType = form.watch("chart_type");
  const constraintsForType = CHART_TYPE_CONSTRAINTS[chartType as keyof typeof CHART_TYPE_CONSTRAINTS] || 
                            CHART_TYPE_CONSTRAINTS.bar;

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'dataset_id' && value.dataset_id) {
        setSelectedDatasetId(parseInt(value.dataset_id));
      }
      if (name === 'chart_type' && value.chart_type) {
        setSelectedChartType(value.chart_type);
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  const getAvailableDimensions = () => {
    if (!datasetDetails) return [];
  
    // First try explicit dimensions if defined
    const dimensions = datasetDetails.dimensions || [];
    if (dimensions.length > 0) return dimensions;
  
    // Use column types to determine dimensions
    if (datasetDetails.column_types) {
      return Object.entries(datasetDetails.column_types)
        .filter(([_, type]) => 
          ['string', 'varchar', 'date', 'timestamp', 'datetime', 'text', 'char'].includes(type.toLowerCase())
        )
        .map(([name]) => ({ name, field: name }));
    }

    return [];
  };
  
  const getAvailableMetrics = () => {
    if (!datasetDetails) return [];

    // Use explicit metrics if defined
    const metrics = datasetDetails.metrics || [];
    if (metrics.length > 0) return metrics;

    // Use column types to determine metrics
    if (datasetDetails.column_types) {
      return Object.entries(datasetDetails.column_types)
        .filter(([_, type]) => 
          ['number', 'integer', 'float', 'decimal', 'double', 'int', 'bigint'].includes(type.toLowerCase())
        )
        .map(([name]) => ({ name, expression: name }));
    }

    return [];
  };

  const onSubmit = async (values: ChartFormValues) => {
    try {
      // Parse JSON fields
      let configObj = {};
      let filtersObj = {};
      let metricsArray: MetricConfig[] = [];
      
      try {
        configObj = values.config ? JSON.parse(values.config) : {};
        filtersObj = values.filters ? JSON.parse(values.filters) : {};
        metricsArray = values.metrics ? JSON.parse(values.metrics) : [];
      } catch (e) {
        toast({
          variant: "destructive",
          title: "Invalid JSON",
          description: "Config, filters or metrics contain invalid JSON",
        });
        return;
      }

      // Parse dimensions and metrics
      const dimensions = values.dimensions
        ? values.dimensions.split(',').map(item => item.trim()).filter(Boolean)
        : [];
      if (!Array.isArray(metricsArray)) {
        toast({
          variant: "destructive",
          title: "Invalid Metrics",
          description: "Metrics must be an array of objects",
        });
        return;
      }
      // Validate against chart type constraints

      const constraints = CHART_TYPE_CONSTRAINTS[values.chart_type as keyof typeof CHART_TYPE_CONSTRAINTS];
      if (constraints) {
        if (dimensions.length < constraints.minDimensions) {
          toast({
            variant: "destructive",
            title: "Invalid Dimensions",
            description: `This chart type requires at least ${constraints.minDimensions} dimension(s).`,
          });
          return;
        }
        
        if (dimensions.length > constraints.maxDimensions) {
          toast({
            variant: "destructive",
            title: "Too Many Dimensions",
            description: `This chart type allows maximum ${constraints.maxDimensions} dimension(s).`,
          });
          return;
        }
        
        if (metricsArray.length < constraints.minMetrics) {
          toast({
            variant: "destructive",
            title: "Invalid Metrics",
            description: `This chart type requires at least ${constraints.minMetrics} metric(s).`,
          });
          return;
        }
        
        if (metricsArray.length > constraints.maxMetrics) {
          toast({
            variant: "destructive",
            title: "Too Many Metrics",
            description: `This chart type allows maximum ${constraints.maxMetrics} metric(s).`,
          });
          return;
        }
        if (datasetDetails?.column_types) {
          for (const metric of metricsArray) {
            const columnType = datasetDetails.column_types[metric.field];
            if (!columnType || !['number', 'integer', 'float', 'decimal', 'double', 'int', 'bigint'].includes(columnType.toLowerCase())) {
              toast({
                variant: "destructive",
                title: "Invalid Aggregation",
                description: `Metric "${metric.name}" is not a numeric field (type: ${columnType || 'unknown'})`,
              });
              return;
            }
          }
        }
      }

      const apiUrl = chart?.id 
        ? `/api/bi/charts/${chart.id}` 
        : '/api/bi/charts';
      
      const method = chart?.id ? 'PUT' : 'POST';
      
      const response = await fetch(apiUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: values.name,
          description: values.description,
          dataset_id: parseInt(values.dataset_id),
          chart_type: values.chart_type,
          dimensions,
          metrics: metricsArray.map(m => m.field),
          aggregations: metricsArray.map(m => m.aggregation),
          config: {
            ...configObj,
            colors: metricsArray.map(m => m.color),
          },
          filters: filtersObj,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save chart');
      }

      const result = await response.json();
      toast({
        title: chart?.id ? "Chart updated" : "Chart created",
        description: `Successfully ${chart?.id ? 'updated' : 'created'} chart ${values.name}`,
      });

      onSuccess();
    } catch (error) {
      console.error('Error saving chart:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save chart",
      });
    }
  };

  const addMetric = (metricName: string) => {
    const currentMetrics: MetricConfig[] = form.getValues('metrics') 
      ? JSON.parse(form.getValues('metrics'))
      : [];
    
    if (!currentMetrics.some(m => m.field === metricName)) {
      const newMetric: MetricConfig = {
        name: metricName,
        field: metricName,
        aggregation: 'sum',
        color: DEFAULT_CHART_CONFIG.colors[currentMetrics.length % DEFAULT_CHART_CONFIG.colors.length]
      };
      
      form.setValue('metrics', JSON.stringify([...currentMetrics, newMetric], null, 2));
    }
  };

  const updateMetric = (index: number, field: keyof MetricConfig, value: any) => {
    const currentMetrics: MetricConfig[] = JSON.parse(form.getValues('metrics'));
    currentMetrics[index][field] = value;
    form.setValue('metrics', JSON.stringify(currentMetrics, null, 2));
  };

  const removeMetric = (index: number) => {
    const currentMetrics: MetricConfig[] = JSON.parse(form.getValues('metrics'));
    const newMetrics = currentMetrics.filter((_, i) => i !== index);
    form.setValue('metrics', JSON.stringify(newMetrics, null, 2));
  };

  const availableDimensions = getAvailableDimensions();
  const availableMetrics = getAvailableMetrics();

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Chart name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Chart description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dataset_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dataset</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    disabled={isLoadingDatasets}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a dataset" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {datasets.map((dataset) => (
                        <SelectItem key={dataset.id} value={dataset.id.toString()}>
                          {dataset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="chart_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chart Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select chart type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="bar">Bar Chart</SelectItem>
                      <SelectItem value="line">Line Chart</SelectItem>
                      <SelectItem value="pie">Pie Chart</SelectItem>
                      <SelectItem value="area">Area Chart</SelectItem>
                      <SelectItem value="table">Table</SelectItem>
                    </SelectContent>
                  </Select>
                  {constraintsForType && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {constraintsForType.description}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <Alert className="bg-muted/50">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Chart Type Requirements</AlertTitle>
              <AlertDescription>
                <ul className="text-xs list-disc pl-5 mt-2">
                  <li>Dimensions: {constraintsForType.minDimensions} to {constraintsForType.maxDimensions}</li>
                  <li>Metrics: {constraintsForType.minMetrics} to {constraintsForType.maxMetrics}</li>
                  <li>Valid aggregations: {constraintsForType.allowedAggregations.join(', ')}</li>
                </ul>
              </AlertDescription>
            </Alert>

            <FormField
              control={form.control}
              name="dimensions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dimensions</FormLabel>
                  <FormControl>
                    {selectedDatasetId && availableDimensions.length > 0 ? (
                      <Select
                        onValueChange={(value) => {
                          const currentValues = field.value ? field.value.split(',').map(v => v.trim()).filter(Boolean) : [];
                          if (!currentValues.includes(value)) {
                            const newValue = [...currentValues, value].join(', ');
                            field.onChange(newValue);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select dimensions" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableDimensions.map((dim) => (
                            <SelectItem key={dim.name} value={dim.field || dim.name}>
                              <div className="flex justify-between items-center">
                                <span>{dim.name}</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  {datasetDetails?.column_types?.[dim.field] || 'string'}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                    <Input 
                      placeholder="dimension1, dimension2" 
                      {...field} 
                    />
                  )}
                </FormControl>
                {field.value && (
                    <div className="mt-2">
                      <p className="text-xs font-medium mb-1">Selected dimensions:</p>
                      <div className="flex flex-wrap gap-1">
                        {field.value.split(',').map(dim => dim.trim()).filter(Boolean).map((dim) => (
                          <div key={dim} className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs flex items-center">
                            {dim}
                            <button
                              type="button"
                              className="ml-1 hover:text-destructive"
                              onClick={() => {
                                const newValue = field.value
                                  .split(',')
                                  .map(v => v.trim())
                                  .filter(v => v !== dim && v !== '')
                                  .join(', ');
                                field.onChange(newValue);
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="metrics"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Metrics</FormLabel>
                  <FormControl>
                    {selectedDatasetId && availableMetrics.length > 0 ? (
                      <Select
                        onValueChange={addMetric}
                      >
                        <SelectTrigger>
                            <SelectValue placeholder="Select metrics to add" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableMetrics.map((metric) => (
                              <SelectItem key={metric.name} value={metric.expression || metric.name}>
                                <div className="flex justify-between items-center">
                                  <span>{metric.name}</span>
                                  <span className="text-xs text-muted-foreground ml-2">
                                    {datasetDetails?.column_types?.[metric.expression || metric.name] || 'number'}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                    ) : (
                    <Input 
                      placeholder="No metrics available" 
                      //{...field} 
                      disabled
                    />
                  )}
                   </FormControl>

                  {field.value && (
                     <div className="mt-4 space-y-4">
                      {JSON.parse(field.value).map((metric: MetricConfig, index: number) => (
                        <div key={index} className="p-4 border rounded-md">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{metric.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMetric(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormItem>
                              <FormLabel>Aggregation</FormLabel>
                              <Select
                                value={metric.aggregation}
                                onValueChange={(value) => updateMetric(index, 'aggregation', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {constraintsForType.allowedAggregations.map(agg => (
                                    <SelectItem key={agg} value={agg}>
                                      {agg === 'sum' && 'Sum'}
                                      {agg === 'avg' && 'Average'}
                                      {agg === 'count' && 'Count'}
                                      {agg === 'min' && 'Minimum'}
                                      {agg === 'max' && 'Maximum'}
                                      {agg === 'none' && 'No Aggregation'}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                            
                            <FormItem>
                              <FormLabel>Color</FormLabel>
                              <Input
                                type="color"
                                value={metric.color}
                                onChange={(e) => updateMetric(index, 'color', e.target.value)}
                                className="w-12 h-10 p-1"
                              />
                            </FormItem>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

<FormField
              control={form.control}
              name="config"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chart Configuration</FormLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-4">
                      <h4 className="font-medium">General Settings</h4>
                      <FormItem>
                        <FormLabel>Color Palette</FormLabel>
                        <div className="flex gap-2">
                          {DEFAULT_CHART_CONFIG.colors.map((color, i) => (
                            <Input
                              key={i}
                              type="color"
                              value={color}
                              onChange={(e) => {
                                const config = JSON.parse(field.value);
                                const newColors = [...config.colors];
                                newColors[i] = e.target.value;
                                field.onChange(JSON.stringify({
                                  ...config,
                                  colors: newColors
                                }, null, 2));
                              }}
                              className="w-8 h-8 p-1"
                            />
                          ))}
                        </div>
                      </FormItem>
                      
                      <FormItem>
                        <FormLabel>Layout</FormLabel>
                        <div className="flex space-x-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="showGrid"
                              checked={JSON.parse(field.value)?.layout?.showGrid ?? true}
                              onCheckedChange={(checked) => {
                                const config = JSON.parse(field.value);
                                field.onChange(JSON.stringify({
                                  ...config,
                                  layout: {
                                    ...config.layout,
                                    showGrid: checked
                                  }
                                }, null, 2));
                              }}
                            />
                            <Label htmlFor="showGrid">Show Grid</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="showLegend"
                              checked={JSON.parse(field.value)?.layout?.showLegend ?? true}
                              onCheckedChange={(checked) => {
                                const config = JSON.parse(field.value);
                                field.onChange(JSON.stringify({
                                  ...config,
                                  layout: {
                                    ...config.layout,
                                    showLegend: checked
                                  }
                                }, null, 2));
                              }}
                            />
                            <Label htmlFor="showLegend">Show Legend</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="showTooltip"
                              checked={JSON.parse(field.value)?.layout?.showTooltip ?? true}
                              onCheckedChange={(checked) => {
                                const config = JSON.parse(field.value);
                                field.onChange(JSON.stringify({
                                  ...config,
                                  layout: {
                                    ...config.layout,
                                    showTooltip: checked
                                  }
                                }, null, 2));
                              }}
                            />
                            <Label htmlFor="showTooltip">Show Tooltip</Label>
                          </div>
                        </div>
                      </FormItem>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="font-medium">Chart Specific Settings</h4>
                      
                      {chartType === 'bar' && (
                        <FormItem>
                          <FormLabel>Bar Size</FormLabel>
                          <Input
                            type="number"
                            value={JSON.parse(field.value)?.bar?.size ?? 30}
                            onChange={(e) => {
                              const config = JSON.parse(field.value);
                              field.onChange(JSON.stringify({
                                ...config,
                                bar: {
                                  ...config.bar,
                                  size: Number(e.target.value)
                                }
                              }, null, 2));
                            }}
                          />
                        </FormItem>
                      )}
                      
                      {chartType === 'line' && (
                        <FormItem>
                          <FormLabel>Line Width</FormLabel>
                          <Input
                            type="number"
                            value={JSON.parse(field.value)?.line?.width ?? 2}
                            onChange={(e) => {
                              const config = JSON.parse(field.value);
                              field.onChange(JSON.stringify({
                                ...config,
                                line: {
                                  ...config.line,
                                  width: Number(e.target.value)
                                }
                              }, null, 2));
                            }}
                          />
                        </FormItem>
                      )}
                      
                      {chartType === 'area' && (
                        <div className="space-y-4">
                          <FormItem>
                            <FormLabel>Area Opacity</FormLabel>
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              max="1"
                              value={JSON.parse(field.value)?.area?.opacity ?? 0.4}
                              onChange={(e) => {
                                const config = JSON.parse(field.value);
                                field.onChange(JSON.stringify({
                                  ...config,
                                  area: {
                                    ...config.area,
                                    opacity: Number(e.target.value)
                                  }
                                }, null, 2));
                              }}
                            />
                          </FormItem>
                          
                          <FormItem>
                            <FormLabel>Stroke Width</FormLabel>
                            <Input
                              type="number"
                              value={JSON.parse(field.value)?.area?.strokeWidth ?? 2}
                              onChange={(e) => {
                                const config = JSON.parse(field.value);
                                field.onChange(JSON.stringify({
                                  ...config,
                                  area: {
                                    ...config.area,
                                    strokeWidth: Number(e.target.value)
                                  }
                                }, null, 2));
                              }}
                            />
                          </FormItem>
                          
                          <FormItem>
                            <FormLabel>Fill Type</FormLabel>
                            <Select
                              value={JSON.parse(field.value)?.area?.fillType ?? 'gradient'}
                              onValueChange={(value) => {
                                const config = JSON.parse(field.value);
                                field.onChange(JSON.stringify({
                                  ...config,
                                  area: {
                                    ...config.area,
                                    fillType: value
                                  }
                                }, null, 2));
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="gradient">Gradient</SelectItem>
                                <SelectItem value="solid">Solid</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                          
                          <FormItem>
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="stackAreas"
                                checked={JSON.parse(field.value)?.area?.stack ?? false}
                                onCheckedChange={(checked) => {
                                  const config = JSON.parse(field.value);
                                  field.onChange(JSON.stringify({
                                    ...config,
                                    area: {
                                      ...config.area,
                                      stack: checked
                                    }
                                  }, null, 2));
                                }}
                              />
                              <Label htmlFor="stackAreas">Stack Areas</Label>
                            </div>
                          </FormItem>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <FormLabel>Advanced Configuration (JSON)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="{}"
                      className="font-mono min-h-[100px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="filters"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Filters (JSON)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="{}"
                      className="font-mono min-h-[100px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit">
                {chart?.id ? "Update Chart" : "Create Chart"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ChartForm;