
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { AlertCircle, Database, FileSpreadsheet, Table } from 'lucide-react';

interface DataSource {
  id: number;
  name: string;
  type: string;
  connection_string: string;
  is_active: boolean;
}

interface Dataset {
  id?: number;
  name: string;
  description: string;
  source_id: number;
  query_type: string;
  query_definition: string;
  base_path?: string;
  iceberg_namespace?: string;
  iceberg_table?: string;
  bucket?: string;
  csv_path?: string;
}

interface DatasetFormProps {
  dataset?: Dataset;
  onSuccess: () => void;
  onCancel: () => void;
}

interface PreviewData {
  columns: Array<{ name: string; type: string }>;
  sample_data: Array<Record<string, any>>;
  total_rows: number;
}

const fetchDataSources = async (): Promise<DataSource[]> => {
  const response = await fetch('/api/bi/data-sources');
  if (!response.ok) {
    throw new Error('Failed to fetch data sources');
  }
  return response.json();
};

const fetchNamespaces = async (): Promise<string[]> => {
  const response = await fetch('/api/iceberg/namespaces');
  if (!response.ok) {
    throw new Error('Failed to fetch namespaces');
  }
  const data = await response.json();
  return data.namespaces;
};

const fetchNamespaceTables = async (namespace: string): Promise<string[]> => {
  if (!namespace) return [];
  const response = await fetch(`/api/iceberg/namespaces/${namespace}/tables`);
  if (!response.ok) {
    throw new Error('Failed to fetch tables');
  }
  const data = await response.json();
  return data.tables;
};

const DatasetForm: React.FC<DatasetFormProps> = ({ dataset, onSuccess, onCancel }) => {
  const queryClient = useQueryClient();
  const [queryType, setQueryType] = useState(dataset?.query_type || 'sql_query');
  const [selectedSourceId, setSelectedSourceId] = useState<number | undefined>(dataset?.source_id);
  const [selectedNamespace, setSelectedNamespace] = useState<string>(dataset?.iceberg_namespace || '');
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<Dataset>({
    defaultValues: dataset || {
      name: '',
      description: '',
      source_id: 0,
      query_type: 'sql_query',
      query_definition: '',
      base_path: '',
      iceberg_namespace: '',
      iceberg_table: '',
      bucket: '',
      csv_path: ''
    }
  });

  const { data: dataSources } = useQuery({
    queryKey: ['data-sources'],
    queryFn: fetchDataSources,
  });

  const { data: namespaces } = useQuery({
    queryKey: ['iceberg-namespaces'],
    queryFn: fetchNamespaces,
    enabled: queryType === 'iceberg_table' || queryType === 'csv_to_iceberg'
  });

  const { data: namespaceTables } = useQuery({
    queryKey: ['namespace-tables', selectedNamespace],
    queryFn: () => fetchNamespaceTables(selectedNamespace),
    enabled: !!selectedNamespace && (queryType === 'iceberg_table' || queryType === 'csv_to_iceberg')
  });

  const watchedValues = watch();

  useEffect(() => {
    setValue('query_type', queryType);
  }, [queryType, setValue]);

  useEffect(() => {
    if (selectedSourceId) {
      setValue('source_id', selectedSourceId);
    }
  }, [selectedSourceId, setValue]);

  useEffect(() => {
    if (selectedNamespace) {
      setValue('iceberg_namespace', selectedNamespace);
    }
  }, [selectedNamespace, setValue]);

  const previewDataset = async () => {
    if (queryType === 'iceberg_table' && selectedNamespace && watchedValues.iceberg_table) {
      setIsPreviewLoading(true);
      try {
        const response = await fetch('/api/iceberg/preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            namespace: selectedNamespace,
            table_name: watchedValues.iceberg_table,
            limit: 100
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to preview dataset');
        }

        const data = await response.json();
        setPreviewData(data);
        
        toast({
          title: 'Preview loaded',
          description: `Showing ${data.total_rows} rows from the Iceberg table`,
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Preview failed',
          description: error instanceof Error ? error.message : 'Failed to preview dataset',
        });
      } finally {
        setIsPreviewLoading(false);
      }
    }
  };

  const createDatasetMutation = useMutation({
    mutationFn: async (data: Dataset) => {
      const url = dataset ? `/api/bi/datasets/${dataset.id}` : '/api/bi/datasets';
      const method = dataset ? 'PUT' : 'POST';

      let requestBody = data;

      // For Iceberg datasets, use the specialized endpoint
      if (data.query_type === 'iceberg_table' || data.query_type === 'csv_to_iceberg') {
        const icebergData = {
          name: data.name,
          description: data.description,
          source_id: data.source_id,
          namespace: data.iceberg_namespace,
          table_name: data.iceberg_table,
          bucket: data.bucket,
          base_path: data.base_path,
          csv_path: data.csv_path
        };

        const response = await fetch('/api/iceberg/datasets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(icebergData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Failed to create Iceberg dataset');
        }

        return response.json();
      }

      // For regular datasets
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || `Failed to ${dataset ? 'update' : 'create'} dataset`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast({
        title: dataset ? 'Dataset updated' : 'Dataset created',
        description: `Dataset has been successfully ${dataset ? 'updated' : 'created'}`,
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: `Error ${dataset ? 'updating' : 'creating'} dataset`,
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  });

  const onSubmit = (data: Dataset) => {
    createDatasetMutation.mutate(data);
  };

  const selectedSource = dataSources?.find(ds => ds.id === selectedSourceId);
  const isIcebergSource = selectedSource?.type === 'iceberg' || selectedSource?.type === 'minio';

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Dataset Name</Label>
            <Input
              id="name"
              {...register('name', { required: 'Dataset name is required' })}
              placeholder="My Dataset"
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Describe your dataset..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="source_id">Data Source</Label>
            <Select value={selectedSourceId?.toString()} onValueChange={(value) => setSelectedSourceId(Number(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a data source" />
              </SelectTrigger>
              <SelectContent>
                {dataSources?.map((source) => (
                  <SelectItem key={source.id} value={source.id.toString()}>
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      <span>{source.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {source.type}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.source_id && (
              <p className="text-sm text-red-600 mt-1">Please select a data source</p>
            )}
          </div>

          <div>
            <Label htmlFor="query_type">Dataset Type</Label>
            <Select value={queryType} onValueChange={setQueryType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sql_query">SQL Query</SelectItem>
                <SelectItem value="table_scan">Table Scan</SelectItem>
                {isIcebergSource && (
                  <>
                    <SelectItem value="iceberg_table">Iceberg Table</SelectItem>
                    <SelectItem value="csv_to_iceberg">CSV to Iceberg</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Query Configuration */}
        {queryType === 'sql_query' && (
          <div>
            <Label htmlFor="query_definition">SQL Query</Label>
            <Textarea
              id="query_definition"
              {...register('query_definition', { required: 'SQL query is required' })}
              placeholder="SELECT * FROM table_name WHERE condition..."
              rows={6}
              className="font-mono"
            />
            {errors.query_definition && (
              <p className="text-sm text-red-600 mt-1">{errors.query_definition.message}</p>
            )}
          </div>
        )}

        {queryType === 'table_scan' && (
          <div>
            <Label htmlFor="query_definition">Table Name</Label>
            <Input
              id="query_definition"
              {...register('query_definition', { required: 'Table name is required' })}
              placeholder="table_name"
            />
            {errors.query_definition && (
              <p className="text-sm text-red-600 mt-1">{errors.query_definition.message}</p>
            )}
          </div>
        )}

        {/* Iceberg Configuration */}
        {(queryType === 'iceberg_table' || queryType === 'csv_to_iceberg') && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="iceberg_namespace">Iceberg Namespace</Label>
              <Select value={selectedNamespace} onValueChange={setSelectedNamespace}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a namespace" />
                </SelectTrigger>
                <SelectContent>
                  {namespaces?.map((namespace) => (
                    <SelectItem key={namespace} value={namespace}>
                      {namespace}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!namespaces || namespaces.length === 0 ? (
                <div className="flex items-center gap-2 mt-2 text-sm text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>No namespaces available. Create one in the Data Sources section.</span>
                </div>
              ) : null}
            </div>

            {queryType === 'iceberg_table' && selectedNamespace && (
              <div>
                <Label htmlFor="iceberg_table">Iceberg Table</Label>
                <Select 
                  value={watchedValues.iceberg_table} 
                  onValueChange={(value) => setValue('iceberg_table', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a table" />
                  </SelectTrigger>
                  <SelectContent>
                    {namespaceTables?.map((table) => (
                      <SelectItem key={table} value={table}>
                        <div className="flex items-center gap-2">
                          <Table className="h-4 w-4" />
                          {table}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {namespaceTables?.length === 0 && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <span>No tables in this namespace</span>
                  </div>
                )}
              </div>
            )}

            {queryType === 'csv_to_iceberg' && (
              <>
                <div>
                  <Label htmlFor="iceberg_table">New Table Name</Label>
                  <Input
                    id="iceberg_table"
                    {...register('iceberg_table', { required: 'Table name is required' })}
                    placeholder="my_table"
                  />
                </div>

                <div>
                  <Label htmlFor="bucket">MinIO Bucket</Label>
                  <Input
                    id="bucket"
                    {...register('bucket', { required: 'Bucket name is required' })}
                    placeholder="my-data-bucket"
                  />
                </div>

                <div>
                  <Label htmlFor="base_path">Base Path (Optional)</Label>
                  <Input
                    id="base_path"
                    {...register('base_path')}
                    placeholder="data/exports"
                  />
                </div>

                <div>
                  <Label htmlFor="csv_path">CSV File Path</Label>
                  <Input
                    id="csv_path"
                    {...register('csv_path', { required: 'CSV path is required' })}
                    placeholder="sales_data.csv"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Preview Section */}
        {queryType === 'iceberg_table' && selectedNamespace && watchedValues.iceberg_table && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={previewDataset}
                disabled={isPreviewLoading}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {isPreviewLoading ? 'Loading Preview...' : 'Preview Data'}
              </Button>
            </div>

            {previewData && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Data Preview</CardTitle>
                  <CardDescription>
                    Showing {previewData.total_rows} rows from {selectedNamespace}.{watchedValues.iceberg_table}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          {previewData.columns.map((col, index) => (
                            <th key={index} className="text-left p-2 font-medium">
                              <div>
                                <div>{col.name}</div>
                                <div className="text-xs text-muted-foreground font-normal">
                                  {col.type}
                                </div>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.sample_data.slice(0, 5).map((row, rowIndex) => (
                          <tr key={rowIndex} className="border-b">
                            {previewData.columns.map((col, colIndex) => (
                              <td key={colIndex} className="p-2 text-xs">
                                {String(row[col.name] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || (!namespaces?.length && (queryType === 'iceberg_table' || queryType === 'csv_to_iceberg'))}
          >
            {isSubmitting ? 'Saving...' : (dataset ? 'Update Dataset' : 'Create Dataset')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default DatasetForm;
