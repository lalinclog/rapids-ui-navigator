
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useQuery } from '@tanstack/react-query';
import { Loader2, Eye, Database, Settings, Columns3 } from 'lucide-react';

// Define form schema
const datasetFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  source_id: z.string().min(1, "Data source is required"),
  query_type: z.string().min(1, "Query type is required"),
  query_value: z.string().min(1, "Query definition is required"),
});

type DatasetFormValues = z.infer<typeof datasetFormSchema>;

interface DataSource {
  id: number;
  name: string;
  type: string;
  description?: string;
}

interface ColumnInfo {
  name: string;
  type: string;
  nullable?: boolean;
  sample_values?: any[];
}

interface SchemaInfo {
  columns: ColumnInfo[];
  sample_data: any[];
  total_rows?: number;
}

interface DatasetFormProps {
  dataset?: {
    id: number;
    name: string;
    description?: string;
    source_id: number;
    query_type: string;
    query_value?: string;
    query_definition?: string; // Add this for backward compatibility
    schema?: any;
    column_types?: Record<string, string>;
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

const fetchSchemaPreview = async (sourceId: number, queryType: string, queryValue: string): Promise<SchemaInfo> => {
  const response = await fetch('/api/bi/datasets/preview', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source_id: sourceId,
      query_type: queryType,
      query_value: queryValue,
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch schema preview');
  }
  return response.json();
};

const DatasetForm: React.FC<DatasetFormProps> = ({ dataset, onSuccess, onCancel }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [schemaInfo, setSchemaInfo] = useState<SchemaInfo | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());
  const [columnTypes, setColumnTypes] = useState<Record<string, string>>({});
  
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
      query_value: dataset?.query_value || dataset?.query_definition || "",
    },
  });

  // Initialize form values when dataset or dataSources change
  useEffect(() => {
      if (dataset) {
        form.reset({
          name: dataset.name,
          description: dataset.description || "",
          source_id: dataset.source_id.toString(),
          query_type: dataset.query_type,
          query_value: dataset.query_value || dataset.query_definition || "",
        });
  
        // Initialize selected columns and types from existing dataset
        if (dataset.schema?.columns) {
      const columns = new Set<string>(dataset.schema.columns.map((col: any) => col.name));
      setSelectedColumns(columns);
      setSchemaInfo(dataset.schema);
    }
    if (dataset.column_types) {
      setColumnTypes(dataset.column_types);
    }
    }
  }, [dataset, form]);

  const selectedSourceType = dataSources.find(
    source => source.id.toString() === form.watch("source_id")
  )?.type;

  const handlePreviewSchema = async () => {
    const values = form.getValues();
    if (!values.source_id || !values.query_type || !values.query_value) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in source, query type, and query definition before previewing",
      });
      return;
    }

    setIsPreviewLoading(true);
    try {
      const preview = await fetchSchemaPreview(
        parseInt(values.source_id),
        values.query_type,
        values.query_value
      );
      
      setSchemaInfo(preview);
      
      // Auto-select all columns initially
      const allColumns = new Set<string>(preview.columns.map(col => col.name));
      setSelectedColumns(allColumns);
      
      // Initialize column types from detected schema
      const detectedTypes: Record<string, string> = {};
      preview.columns.forEach(col => {
        detectedTypes[col.name] = col.type;
      });
      setColumnTypes(detectedTypes);
      
      toast({
        title: "Schema Preview Generated",
        description: `Found ${preview.columns.length} columns with ${preview.sample_data.length} sample rows`,
      });
    } catch (error) {
      console.error('Error previewing schema:', error);
      toast({
        variant: "destructive",
        title: "Preview Failed",
        description: error instanceof Error ? error.message : "Failed to preview dataset schema",
      });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleColumnToggle = (columnName: string) => {
    const newSelected = new Set(selectedColumns);
    if (newSelected.has(columnName)) {
      newSelected.delete(columnName);
    } else {
      newSelected.add(columnName);
    }
    setSelectedColumns(newSelected);
  };

  const handleColumnTypeChange = (columnName: string, newType: string) => {
    setColumnTypes(prev => ({
      ...prev,
      [columnName]: newType
    }));
  };

  const onSubmit = async (values: DatasetFormValues) => {
    setIsSubmitting(true);
    try {
      const apiUrl = dataset?.id 
        ? `/api/bi/datasets/${dataset.id}` 
        : '/api/bi/datasets';
      
      const method = dataset?.id ? 'PUT' : 'POST';

      // Prepare schema definition
      const schemaDefinition = schemaInfo ? {
        columns: schemaInfo.columns
          .filter(col => selectedColumns.has(col.name))
          .map(col => ({
            name: col.name,
            type: columnTypes[col.name] || col.type,
            nullable: col.nullable,
          }))
      } : undefined;
      
      const payload = {
        name: values.name,
        description: values.description,
        source_id: parseInt(values.source_id),
        query_type: values.query_type,
        query_definition: values.query_value, // Use query_definition for backend
        query_value: values.query_value, // Keep query_value for frontend compatibility
        schema: schemaDefinition,
        column_types: Object.fromEntries(
          Array.from(selectedColumns).map(col => [col, columnTypes[col]])
        ),
        cache_policy: {
          enabled: true,
          ttl_minutes: 60,
          auto_refresh: false
        },
        user_id: 1 // Always include user_id for both create and update
      };
      
      console.log('Submitting dataset payload:', payload);

      const response = await fetch(apiUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || errorData?.message || 'Failed to save dataset');
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

  const availableColumnTypes = [
    'string', 'integer', 'float', 'boolean', 'date', 'datetime', 'timestamp', 'text', 'json'
  ];

  return (
    <Card className="max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          {dataset?.id ? "Edit Dataset" : "Create New Dataset"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Basic Info
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview & Schema
            </TabsTrigger>
            <TabsTrigger value="columns" className="flex items-center gap-2" disabled={!schemaInfo}>
              <Columns3 className="h-4 w-4" />
              Column Selection
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <Form {...form}>
              <div className="space-y-4">
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
                    value={field.value}
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
                  <Select onValueChange={field.onChange} value={field.value}>
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
                  name="query_value"
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
              </div>
            </Form>
          </TabsContent>

          <TabsContent value="preview">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Dataset Preview</h3>
                <Button 
                  onClick={handlePreviewSchema} 
                  disabled={isPreviewLoading}
                  variant="outline"
                >
                  {isPreviewLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate Preview
                </Button>
              </div>

              {schemaInfo && (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <Badge variant="secondary">
                      {schemaInfo.columns.length} columns
                    </Badge>
                    <Badge variant="secondary">
                      {schemaInfo.sample_data.length} sample rows
                    </Badge>
                    {schemaInfo.total_rows && (
                      <Badge variant="outline">
                        {schemaInfo.total_rows} total rows
                      </Badge>
                    )}
                  </div>

                  <div className="border rounded-lg max-h-96 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {schemaInfo.columns.map((col) => (
                            <TableHead key={col.name} className="min-w-32">
                              <div className="space-y-1">
                                <div className="font-medium">{col.name}</div>
                                <Badge variant="outline" className="text-xs">
                                  {col.type}
                                </Badge>
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {schemaInfo.sample_data.slice(0, 10).map((row, index) => (
                          <TableRow key={index}>
                            {schemaInfo.columns.map((col) => (
                              <TableCell key={col.name} className="max-w-48 truncate">
                                {row[col.name] !== null && row[col.name] !== undefined 
                                  ? String(row[col.name]) 
                                  : <span className="text-muted-foreground italic">null</span>
                                }
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="columns">
            {schemaInfo && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Column Selection & Types</h3>
                  <div className="text-sm text-muted-foreground">
                    {selectedColumns.size} of {schemaInfo.columns.length} columns selected
                  </div>
                </div>

                <div className="space-y-2">
                  {schemaInfo.columns.map((col) => (
                    <div key={col.name} className="flex items-center gap-4 p-3 border rounded-lg">
                      <Checkbox
                        checked={selectedColumns.has(col.name)}
                        onCheckedChange={() => handleColumnToggle(col.name)}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{col.name}</div>
                        {col.sample_values && col.sample_values.length > 0 && (
                          <div className="text-xs text-muted-foreground truncate">
                            Sample: {col.sample_values.slice(0, 3).join(', ')}
                          </div>
                        )}
                      </div>

                      <Select
                        value={columnTypes[col.name] || col.type}
                        onValueChange={(value) => handleColumnTypeChange(col.name, value)}
                        disabled={!selectedColumns.has(col.name)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableColumnTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-6 border-t mt-6">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {dataset?.id ? "Update Dataset" : "Create Dataset"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Missing function implementations from the original file
const fetchDataSources = async (): Promise<DataSource[]> => {
  const response = await fetch('/api/bi/data-sources');
  if (!response.ok) {
    throw new Error('Failed to fetch data sources');
  }
  return response.json();
};

const fetchSchemaPreview = async (sourceId: number, queryType: string, queryValue: string): Promise<SchemaInfo> => {
  const response = await fetch('/api/bi/datasets/preview', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source_id: sourceId,
      query_type: queryType,
      query_value: queryValue,
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch schema preview');
  }
  return response.json();
};

export default DatasetForm;
