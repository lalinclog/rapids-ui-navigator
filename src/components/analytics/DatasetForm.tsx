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
import { Label } from "@/components/ui/label"
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
  base_path: z.string().optional(), // Add base_path field for MinIO
});

type DatasetFormValues = z.infer<typeof datasetFormSchema>;

interface DataSource {
  id: number;
  name: string;
  type: string;
  description?: string;
  config?: any; // MinIO config will be stored here
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
    query_definition?: string;
    schema?: any;
    column_types?: Record<string, string>;
    base_path?: string; // Add base_path to dataset type
    iceberg_namespace?: string; // Add Iceberg fields
    iceberg_table?: string;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

const fetchDataSources = async (): Promise<DataSource[]> => {
  console.log('🔍 TRACE: fetchDataSources - Starting request to /api/bi/data-sources');
  
  const response = await fetch('/api/bi/data-sources');
  
  console.log('🔍 TRACE: fetchDataSources - Response status:', response.status);
  
  if (!response.ok) {
    console.error('🔍 TRACE: fetchDataSources - Request failed:', response.status, response.statusText);
    throw new Error('Failed to fetch data sources');
  }
  
  const data = await response.json();
  console.log('🔍 TRACE: fetchDataSources - Response data:', data);
  
  return data;
};

const fetchSchemaPreview = async (sourceId: number, queryType: string, queryValue: string, basePath?: string): Promise<SchemaInfo> => {
  const endpoint = `/api/bi/datasets/${sourceId}/preview`;
  const payload = {
    source_id: sourceId,
    query_type: queryType,
    query_value: queryValue,
    base_path: basePath, // Include base_path in payload
  };
  
  console.log('🔍 TRACE: fetchSchemaPreview - Starting request');
  console.log('🔍 TRACE: fetchSchemaPreview - Endpoint:', endpoint);
  console.log('🔍 TRACE: fetchSchemaPreview - Payload:', JSON.stringify(payload, null, 2));
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  console.log('🔍 TRACE: fetchSchemaPreview - Response status:', response.status);
  console.log('🔍 TRACE: fetchSchemaPreview - Response ok:', response.ok);

  const responseText = await response.text();
  console.log('🔍 TRACE: fetchSchemaPreview - Raw response text:', responseText);

  if (!response.ok) {
    console.error('🔍 TRACE: fetchSchemaPreview - Request failed:', response.status, response.statusText);
    console.error('🔍 TRACE: fetchSchemaPreview - Error response:', responseText);
    
    // Handle 500 errors from numpy serialization issues
    if (response.status === 500 && responseText.includes('numpy')) {
      throw new Error('Backend serialization error. Please try again or contact support.');
    }
    
    throw new Error('Failed to fetch schema preview');
  }

  let responseData;
  try {
    responseData = JSON.parse(responseText);
    console.log('🔍 TRACE: fetchSchemaPreview - Parsed response data:', JSON.stringify(responseData, null, 2));
  } catch (parseError) {
    console.error('🔍 TRACE: fetchSchemaPreview - JSON parse error:', parseError);
    throw new Error('Invalid JSON response from server');
  }

  return responseData;
};

const fetchIcebergNamespaces = async (): Promise<string[]> => {
  const response = await fetch('/api/iceberg/namespaces');
  if (!response.ok) {
    throw new Error('Failed to fetch Iceberg namespaces');
  }
  const data = await response.json();
  return data.namespaces;
};

const fetchIcebergTables = async (namespace: string): Promise<string[]> => {
  const response = await fetch(`/api/iceberg/namespaces/${namespace}/tables`);
  if (!response.ok) {
    throw new Error('Failed to fetch Iceberg tables');
  }
  const data = await response.json();
  return data.tables;
};

const DatasetForm: React.FC<DatasetFormProps> = ({ dataset, onSuccess, onCancel }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [schemaInfo, setSchemaInfo] = useState<SchemaInfo | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());
  const [columnTypes, setColumnTypes] = useState<Record<string, string>>({});
  const [icebergNamespaces, setIcebergNamespaces] = useState<string[]>([]);
  const [icebergTables, setIcebergTables] = useState<string[]>([]);
  const [selectedNamespace, setSelectedNamespace] = useState<string>("");

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
      base_path: dataset?.base_path || "", // Initialize base_path
    },
  });

  // Get selected data source
  const selectedSource = dataSources.find(
    source => source.id.toString() === form.watch("source_id")
  );

  // Auto-populate MinIO configuration from data source config
  useEffect(() => {
    if (selectedSource?.type === 'minio' && selectedSource.config && !dataset) {
      // Only auto-populate for new datasets, not when editing existing ones
      const config = selectedSource.config;
      
      if (config.bucket) {
        form.setValue("query_value", config.bucket);
        form.setValue("query_type", "bucket");
      }
      
      // Set base_path from config
      if (config.prefix || config.base_path) {
        form.setValue("base_path", config.prefix || config.base_path || "");
      }
      
      console.log('🔍 TRACE: Auto-populated MinIO config from data source:', config);
    }
  }, [selectedSource, form, dataset]);

  // Initialize form values when dataset or dataSources change
  useEffect(() => {
    if (dataset) {
      form.reset({
        name: dataset.name,
        description: dataset.description || "",
        source_id: dataset.source_id.toString(),
        query_type: dataset.query_type,
        query_value: dataset.query_value || dataset?.query_definition || "",
        base_path: dataset.base_path || "", // Initialize base_path from dataset
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

  const handlePreviewSchema = async () => {
    const values = form.getValues();
    
    console.log('🔍 TRACE: handlePreviewSchema - Starting preview generation');
    console.log('🔍 TRACE: handlePreviewSchema - Form values:', values);
    
    if (!values.source_id || !values.query_type || !values.query_value) {
      console.error('🔍 TRACE: handlePreviewSchema - Missing required values');
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in source, query type, and query definition before previewing",
      });
      return;
    }

    setIsPreviewLoading(true);
    console.log('🔍 TRACE: handlePreviewSchema - Set preview loading to true');
    
    try {
      console.log('🔍 TRACE: handlePreviewSchema - Calling fetchSchemaPreview with:', {
        sourceId: parseInt(values.source_id),
        queryType: values.query_type,
        queryValue: values.query_value,
        basePath: values.base_path
      });
      
      const preview = await fetchSchemaPreview(
        parseInt(values.source_id),
        values.query_type,
        values.query_value,
        values.base_path
      );

      console.log('🔍 TRACE: handlePreviewSchema - Received preview response:', preview);
      console.log('🔍 TRACE: handlePreviewSchema - Preview columns length:', preview.columns?.length);
      console.log('🔍 TRACE: handlePreviewSchema - Preview sample_data length:', preview.sample_data?.length);

      setSchemaInfo(preview);

      // Auto-select all columns initially
      const allColumns = new Set<string>(preview.columns.map(col => col.name));
      setSelectedColumns(allColumns);
      console.log('🔍 TRACE: handlePreviewSchema - Selected columns:', Array.from(allColumns));

      // Initialize column types from detected schema
      const detectedTypes: Record<string, string> = {};
      preview.columns.forEach(col => {
        detectedTypes[col.name] = col.type;
      });
      setColumnTypes(detectedTypes);
      console.log('🔍 TRACE: handlePreviewSchema - Detected column types:', detectedTypes);

      toast({
        title: "Schema Preview Generated",
        description: `Found ${preview.columns.length} columns with ${preview.sample_data.length} sample rows`,
      });
    } catch (error) {
      console.error('🔍 TRACE: handlePreviewSchema - Error occurred:', error);
      toast({
        variant: "destructive",
        title: "Preview Failed",
        description: error instanceof Error ? error.message : "Failed to preview dataset schema",
      });
    } finally {
      setIsPreviewLoading(false);
      console.log('🔍 TRACE: handlePreviewSchema - Set preview loading to false');
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
        query_definition: values.query_value,
        query_value: values.query_value,
        base_path: values.base_path, // Include base_path in payload
        schema: schemaDefinition,
        column_types: Object.fromEntries(
          Array.from(selectedColumns).map(col => [col, columnTypes[col]])
        ),
        cache_policy: {
          enabled: true,
          ttl_minutes: 60,
          auto_refresh: false
        },
        user_id: 1
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

    if (selectedSource?.type === 'minio') {
      if (queryType === 'custom') {
        // Show example with actual config if available
        const config = selectedSource.config;
        if (config) {
          return JSON.stringify({
            bucket: config.bucket || "my-bucket",
            prefix: config.prefix || "data/",
            file_type: config.file_type || "csv"
          }, null, 2);
        }
        return '{"bucket": "my-bucket", "prefix": "data/", "file_type": "csv"}';
      }
      return selectedSource.config?.bucket || 'bucket-name';
    } else {
      if (queryType === 'custom') {
        return 'SELECT * FROM table_name WHERE condition = value';
      }
      return 'table_name';
    }
  };

  const getQueryLabel = () => {
    const queryType = form.watch("query_type");

    if (selectedSource?.type === 'minio') {
      return queryType === 'custom' ? 'MinIO Configuration (JSON)' : 'Bucket Name';
    } else {
      return queryType === 'custom' ? 'SQL Query' : 'Table/View Name';
    }
  };

  const getQueryTypeOptions = () => {
    if (selectedSource?.type === 'minio') {
      return [
        { value: 'bucket', label: 'Bucket (CSV Files)' },
        { value: 'iceberg_table', label: 'Iceberg Table' },
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

  const renderIcebergTableConfig = () => {
    if (selectedSource?.type !== 'minio' || form.watch("query_type") !== "iceberg_table") {
      return null;
    }

    return (
      <div className="space-y-4">
        <div>
          <Label>Iceberg Namespace</Label>
          <Select 
            value={selectedNamespace} 
            onValueChange={(value) => {
              setSelectedNamespace(value);
              form.setValue("query_value", `${value}.`);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select namespace" />
            </SelectTrigger>
            <SelectContent>
              {icebergNamespaces.map((namespace) => (
                <SelectItem key={namespace} value={namespace}>
                  {namespace}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Iceberg Table</Label>
          <Select 
            value={form.watch("query_value")?.split('.')[1] || ''} 
            onValueChange={(value) => {
              form.setValue("query_value", `${selectedNamespace}.${value}`);
            }}
            disabled={!selectedNamespace}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select table" />
            </SelectTrigger>
            <SelectContent>
              {icebergTables.map((table) => (
                <SelectItem key={table} value={table}>
                  {table}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-muted-foreground">
          Or create a new table from CSV files by specifying the table name and CSV path below.
        </div>

        <div>
          <Label>New Table Name (Optional)</Label>
          <Input 
            placeholder="my_new_table" 
            onChange={(e) => {
              if (e.target.value && selectedNamespace) {
                form.setValue("query_value", `${selectedNamespace}.${e.target.value}`);
              }
            }}
          />
        </div>

        <div>
          <Label>CSV Path (for new table creation)</Label>
          <Input 
            placeholder="data/sales/customers.csv" 
            onChange={(e) => {
              // Store CSV path for table creation
            }}
          />
        </div>
      </div>
    );
  };

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
                              {source.config && source.type === 'minio' && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  [{source.config.bucket}]
                                </span>
                              )}
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

                {/* Conditional rendering based on query type */}
                {form.watch("query_type") === "iceberg_table" ? (
                  renderIcebergTableConfig()
                ) : (
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
                )}

                {/* Add base_path input for MinIO sources */}
                {selectedSource?.type === 'minio' && (
                  <FormField
                    control={form.control}
                    name="base_path"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Path / Prefix</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="data/sales/"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                        <div className="text-xs text-muted-foreground">
                          The path within the bucket to treat as the table root (e.g., "sales/customers/")
                        </div>
                      </FormItem>
                    )}
                  />
                )}

                {selectedSource?.type === 'minio' && selectedSource.config && (
                  <div className="text-xs text-muted-foreground mt-1 p-2 bg-muted rounded">
                    <strong>Data Source Config:</strong> {JSON.stringify(selectedSource.config)}
                  </div>
                )}
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

export default DatasetForm;
