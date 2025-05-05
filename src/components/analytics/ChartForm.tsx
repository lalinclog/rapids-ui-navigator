
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

// Define form schema
const chartFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  dataset_id: z.string().min(1, "Dataset is required"),
  chart_type: z.string().min(1, "Chart type is required"),
  config: z.string().optional(),
  dimensions: z.string().optional(),
  metrics: z.string().optional(),
  filters: z.string().optional(),
});

type ChartFormValues = z.infer<typeof chartFormSchema>;

interface Dataset {
  id: number;
  name: string;
}

interface ChartFormProps {
  chart?: {
    id: number;
    name: string;
    description: string | null;
    dataset_id: number;
    chart_type: string;
    config: any;
    dimensions: string[];
    metrics: string[];
    filters: any;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

const fetchDatasets = async (): Promise<Dataset[]> => {
  const response = await fetch('/api/bi/datasets');
  if (!response.ok) {
    throw new Error('Failed to fetch datasets');
  }
  return response.json();
};

const ChartForm: React.FC<ChartFormProps> = ({ chart, onSuccess, onCancel }) => {
  const { data: datasets = [], isLoading: isLoadingDatasets } = useQuery({
    queryKey: ['datasets'],
    queryFn: fetchDatasets,
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
      filters: chart?.filters ? JSON.stringify(chart.filters, null, 2) : "{}",
    },
  });

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
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dimensions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dimensions</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="dimension1, dimension2" 
                      {...field} 
                    />
                  </FormControl>
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
                    <Input 
                      placeholder="metric1, metric2" 
                      {...field} 
                    />
                  </FormControl>
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
