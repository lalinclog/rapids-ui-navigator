
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
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Define form schema
const chartFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  dataset_id: z.string().min(1, "Dataset is required"),
  chart_type: z.string().min(1, "Chart type is required"),
  config: z.string().optional(),
  dimensions: z.string().optional(),
  metrics: z.string().optional(),
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
    aggregation?: string;
    filters: Record<string, unknown>;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

const CHART_TYPE_CONSTRAINTS = {
  bar: {
    minDimensions: 1,
    maxDimensions: 2,
    minMetrics: 1,
    maxMetrics: 5,
    allowedAggregations: ['sum', 'avg', 'count', 'min', 'max'],
    description: 'Bar charts require at least one dimension (category) and one metric (value).'
  },
  line: {
    minDimensions: 1,
    maxDimensions: 1,
    minMetrics: 1,
    maxMetrics: 5,
    allowedAggregations: ['sum', 'avg', 'count', 'min', 'max'],
    description: 'Line charts work best with time dimensions and one or more metrics.'
  },
  pie: {
    minDimensions: 1,
    maxDimensions: 1,
    minMetrics: 1,
    maxMetrics: 1,
    allowedAggregations: ['sum', 'count'],
    description: 'Pie charts require exactly one dimension and one metric.'
  },
  area: {
    minDimensions: 1,
    maxDimensions: 1,
    minMetrics: 1,
    maxMetrics: 3,
    allowedAggregations: ['sum', 'avg'],
    description: 'Area charts work best with time dimensions and continuous metrics.'
  },
  table: {
    minDimensions: 0,
    maxDimensions: 10,
    minMetrics: 0,
    maxMetrics: 10,
    allowedAggregations: ['sum', 'avg', 'count', 'min', 'max', 'none'],
    description: 'Tables can display multiple dimensions and metrics without restrictions.'
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
    queryFn: () => fetchDatasetDetails(selectedDatasetId as number),
    enabled: !!selectedDatasetId,
  });

  const form = useForm<ChartFormValues>({
    resolver: zodResolver(chartFormSchema),
    defaultValues: {
      name: chart?.name || "",
      description: chart?.description || "",
      dataset_id: chart?.dataset_id ? chart.dataset_id.toString() : "",
      chart_type: chart?.chart_type || "bar",
      config: chart?.config ? JSON.stringify(chart.config, null, 2) : "{}",
      dimensions: chart?.dimensions ? chart.dimensions.join(", ") : "",
      metrics: chart?.metrics ? chart.metrics.join(", ") : "",
      aggregation: chart?.aggregation || "sum",
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

    const dimensions = datasetDetails.dimensions || [];
    
    // If no explicit dimensions are defined, try to derive them from schema
    if (dimensions.length === 0 && datasetDetails.schema?.fields) {
      // Consider string/date/timestamp fields as potential dimensions
      return datasetDetails.schema.fields
        .filter(field => 
          ['string', 'varchar', 'date', 'timestamp', 'datetime', 'text', 'char'].includes(field.type.toLowerCase())
        )
        .map(field => ({ name: field.name, field: field.name }));
    }
    
    return dimensions;
  };
  
  const getAvailableMetrics = () => {
    if (!datasetDetails) return [];
    
    const metrics = datasetDetails.metrics || [];
    
    // If no explicit metrics are defined, try to derive them from schema
    if (metrics.length === 0 && datasetDetails.schema?.fields) {
      // Consider numeric fields as potential metrics
      return datasetDetails.schema.fields
        .filter(field => 
          ['number', 'integer', 'float', 'decimal', 'double', 'int', 'bigint'].includes(field.type.toLowerCase())
        )
        .map(field => ({ name: field.name, expression: field.name }));
    }
    
    return metrics;
  };

  const onSubmit = async (values: ChartFormValues) => {
    try {
      // Parse JSON fields
      let configObj = {};
      let filtersObj = {};
      
      try {
        configObj = values.config ? JSON.parse(values.config) : {};
        filtersObj = values.filters ? JSON.parse(values.filters) : {};
      } catch (e) {
        toast({
          variant: "destructive",
          title: "Invalid JSON",
          description: "Config or filters contain invalid JSON",
        });
        return;
      }

      // Parse dimensions and metrics
      const dimensions = values.dimensions
        ? values.dimensions.split(',').map(item => item.trim()).filter(Boolean)
        : [];
      const metrics = values.metrics
        ? values.metrics.split(',').map(item => item.trim()).filter(Boolean)
        : [];

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
        
        if (metrics.length < constraints.minMetrics) {
          toast({
            variant: "destructive",
            title: "Invalid Metrics",
            description: `This chart type requires at least ${constraints.minMetrics} metric(s).`,
          });
          return;
        }
        
        if (metrics.length > constraints.maxMetrics) {
          toast({
            variant: "destructive",
            title: "Too Many Metrics",
            description: `This chart type allows maximum ${constraints.maxMetrics} metric(s).`,
          });
          return;
        }
        
        if (values.aggregation && !constraints.allowedAggregations.includes(values.aggregation)) {
          toast({
            variant: "destructive",
            title: "Invalid Aggregation",
            description: `This chart type doesn't support the selected aggregation method.`,
          });
          return;
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
          config: configObj,
          dimensions,
          metrics,
          aggregation: values.aggregation || 'sum',
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
                              {dim.name}
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
                        onValueChange={(value) => {
                          const currentValues = field.value ? field.value.split(',').map(v => v.trim()).filter(Boolean) : [];
                          if (!currentValues.includes(value)) {
                            const newValue = [...currentValues, value].join(', ');
                            field.onChange(newValue);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select metrics" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableMetrics.map((metric) => (
                            <SelectItem key={metric.name} value={metric.expression || metric.name}>
                              {metric.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input 
                        placeholder="metric1, metric2" 
                        {...field} 
                      />
                    )}
                  </FormControl>
                  {field.value && (
                    <div className="mt-2">
                      <p className="text-xs font-medium mb-1">Selected metrics:</p>
                      <div className="flex flex-wrap gap-1">
                        {field.value.split(',').map(metric => metric.trim()).filter(Boolean).map((metric) => (
                          <div key={metric} className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs flex items-center">
                            {metric}
                            <button
                              type="button"
                              className="ml-1 hover:text-destructive"
                              onClick={() => {
                                const newValue = field.value
                                  .split(',')
                                  .map(v => v.trim())
                                  .filter(v => v !== metric && v !== '')
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
              name="aggregation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aggregation Method</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value || 'sum'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select aggregation method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {constraintsForType.allowedAggregations.map((agg) => (
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="config"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chart Configuration (JSON)</FormLabel>
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
