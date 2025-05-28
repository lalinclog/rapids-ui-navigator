
import React, { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

// Define form schema
const datasetFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  source_id: z.string().min(1, "Data source is required"),
  query_type: z.string().min(1, "Query type is required"),
  query_definition: z.string().min(1, "Query definition is required"),
});

type DatasetFormValues = z.infer<typeof datasetFormSchema>;

interface DataSource {
  id: number;
  name: string;
  type: string;
  description?: string;
}

interface DatasetFormProps {
  dataset?: {
    id: number;
    name: string;
    description?: string;
    source_id: number;
    query_type: string;
    query_definition: string;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
      query_definition: dataset?.query_definition || "",
    },
  });

  const selectedSourceType = dataSources.find(
    source => source.id.toString() === form.watch("source_id")
  )?.type;

  const onSubmit = async (values: DatasetFormValues) => {
    setIsSubmitting(true);
    try {
      const apiUrl = dataset?.id 
        ? `/api/bi/datasets/${dataset.id}` 
        : '/api/bi/datasets';
      
      const method = dataset?.id ? 'PUT' : 'POST';
      
      // Prepare payload based on source type and query type
      let queryDefinition = values.query_definition;
      
      // For MinIO sources, ensure query definition is JSON
      if (selectedSourceType === 'minio' && values.query_type === 'custom') {
        try {
          // Try to parse as JSON to validate
          JSON.parse(queryDefinition);
        } catch {
          // If not valid JSON, wrap in a basic structure
          queryDefinition = JSON.stringify({
            bucket: values.query_definition,
            prefix: "",
            file_type: "csv"
          });
        }
      }
      
      const response = await fetch(apiUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          source_id: parseInt(values.source_id),
          query_definition: queryDefinition,
          cache_policy: {
            enabled: true,
            ttl_minutes: 60,
            auto_refresh: false
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to save dataset');
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const getQueryPlaceholder = () => {
    const queryType = form.watch("query_type");
    
    if (selectedSourceType === 'minio') {
      if (queryType === 'custom') {
        return '{"bucket": "my-bucket", "prefix": "data/", "file_type": "csv"}';
      }
      return 'bucket-name';
    } else {
      if (queryType === 'custom') {
        return 'SELECT * FROM table_name WHERE condition = value';
      }
      return 'table_name';
    }
  };

  const getQueryLabel = () => {
    const queryType = form.watch("query_type");
    
    if (selectedSourceType === 'minio') {
      return queryType === 'custom' ? 'MinIO Configuration (JSON)' : 'Bucket Name';
    } else {
      return queryType === 'custom' ? 'SQL Query' : 'Table/View Name';
    }
  };

  const getQueryTypeOptions = () => {
    if (selectedSourceType === 'minio') {
      return [
        { value: 'bucket', label: 'Bucket' },
        { value: 'custom', label: 'Custom Configuration' }
      ];
    } else {
      return [
        { value: 'table', label: 'Table' },
        { value: 'view', label: 'View' },
        { value: 'custom', label: 'Custom SQL' }
      ];
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {dataset?.id ? "Edit Dataset" : "Create New Dataset"}
        </CardTitle>
      </CardHeader>
      <CardContent>
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
                      {getQueryTypeOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
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
              name="query_definition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getQueryLabel()}</FormLabel>
                  <FormControl>
                    {form.watch("query_type") === "custom" ? (
                      <Textarea 
                        placeholder={getQueryPlaceholder()}
                        className="font-mono min-h-[100px]" 
                        {...field} 
                      />
                    ) : (
                      <Input 
                        placeholder={getQueryPlaceholder()}
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
