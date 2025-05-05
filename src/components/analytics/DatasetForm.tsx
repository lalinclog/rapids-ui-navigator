
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
const datasetFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  source_id: z.string().min(1, "Data source is required"),
  query_type: z.string().min(1, "Query type is required"),
  query_value: z.string().min(1, "Query value is required"),
});

type DatasetFormValues = z.infer<typeof datasetFormSchema>;

interface DataSource {
  id: number;
  name: string;
  type: string;
}

interface DatasetFormProps {
  dataset?: {
    id: number;
    name: string;
    description: string | null;
    source_id: number;
    query_type: string;
    query_value: string;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

const fetchDataSources = async (): Promise<DataSource[]> => {
  const response = await fetch('/api/bi/data-sources');
  if (!response.ok) {
    throw new Error('Failed to fetch data sources');
  }
  return response.json();
};

const DatasetForm: React.FC<DatasetFormProps> = ({ dataset, onSuccess, onCancel }) => {
  const { data: dataSources = [], isLoading: isLoadingDataSources } = useQuery({
    queryKey: ['data-sources'],
    queryFn: fetchDataSources,
  });

  const form = useForm<DatasetFormValues>({
    resolver: zodResolver(datasetFormSchema),
    defaultValues: {
      name: dataset?.name || "",
      description: dataset?.description || "",
      source_id: dataset?.source_id ? dataset.source_id.toString() : "",
      query_type: dataset?.query_type || "table",
      query_value: dataset?.query_value || "",
    },
  });

  const onSubmit = async (values: DatasetFormValues) => {
    try {
      const apiUrl = dataset?.id 
        ? `/api/bi/datasets/${dataset.id}` 
        : '/api/bi/datasets';
      
      const method = dataset?.id ? 'PUT' : 'POST';
      
      const response = await fetch(apiUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          source_id: parseInt(values.source_id),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save dataset');
      }

      const result = await response.json();
      toast({
        title: dataset?.id ? "Dataset updated" : "Dataset created",
        description: `Successfully ${dataset?.id ? 'updated' : 'created'} dataset ${values.name}`,
      });

      onSuccess();
    } catch (error) {
      console.error('Error saving dataset:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save dataset",
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
                    <Input placeholder="Dataset name" {...field} />
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
                    <Textarea placeholder="Dataset description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="source_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Source</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    disabled={isLoadingDataSources}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a data source" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {dataSources.map((source) => (
                        <SelectItem key={source.id} value={source.id.toString()}>
                          {source.name} ({source.type})
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
              name="query_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Query Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select query type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="table">Table</SelectItem>
                      <SelectItem value="view">View</SelectItem>
                      <SelectItem value="custom">Custom SQL</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="query_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {form.watch("query_type") === "custom" ? "SQL Query" : "Table/View Name"}
                  </FormLabel>
                  <FormControl>
                    {form.watch("query_type") === "custom" ? (
                      <Textarea 
                        placeholder={form.watch("query_type") === "custom" ? "SELECT * FROM table" : "table_name"}
                        className="font-mono min-h-[100px]" 
                        {...field} 
                      />
                    ) : (
                      <Input 
                        placeholder="table_name" 
                        {...field} 
                      />
                    )}
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
                {dataset?.id ? "Update Dataset" : "Create Dataset"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default DatasetForm;
