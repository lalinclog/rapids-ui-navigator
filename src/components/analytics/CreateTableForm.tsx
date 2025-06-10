
import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { createIcebergDataset } from '@/lib/api/datasets';
import { listNamespaces } from '@/lib/api/iceberg';
import authService from '@/services/AuthService';

interface DataSource {
  id: number;
  name: string;
  type: string;
  connection_string: string;
  is_active: boolean;
}

interface CreateTableFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  selectedNamespace?: string;
  selectedSourceId?: number;
}

const CreateTableForm: React.FC<CreateTableFormProps> = ({ 
  onSuccess, 
  onCancel, 
  selectedNamespace,
  selectedSourceId 
}) => {
  console.log('CreateTableForm: Component rendered with props:', { 
    onSuccess, 
    onCancel, 
    selectedNamespace, 
    selectedSourceId 
  });
  
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    namespace: selectedNamespace || '',
    table_name: '',
    bucket: '',
    base_path: '',
    csv_path: '',
    source_id: selectedSourceId || 0
  });

  console.log('CreateTableForm: Initial formData state:', formData);

  // Fetch available data sources
  const { data: dataSources } = useQuery({
    queryKey: ['data-sources'],
    queryFn: async () => {
      const response = await fetch('/api/bi/data-sources');
      if (!response.ok) {
        throw new Error('Failed to fetch data sources');
      }
      return response.json();
    },
  });

  // Update form when props change
  useEffect(() => {
    if (selectedNamespace) {
      console.log('CreateTableForm: Setting namespace from prop:', selectedNamespace);
      setFormData(prev => ({ ...prev, namespace: selectedNamespace }));
    }
  }, [selectedNamespace]);

  useEffect(() => {
    if (selectedSourceId) {
      console.log('CreateTableForm: Setting source_id from prop:', selectedSourceId);
      setFormData(prev => ({ ...prev, source_id: selectedSourceId }));
    }
  }, [selectedSourceId]);

  // Auto-generate bucket and base_path based on table_name
  useEffect(() => {
    if (formData.table_name) {
      const sanitizedTableName = formData.table_name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const newBucket = `iceberg-${sanitizedTableName}`;
      const newBasePath = `/tables/${formData.namespace}/${sanitizedTableName}`;
      
      console.log('CreateTableForm: Auto-generating paths for table:', formData.table_name);
      console.log('CreateTableForm: Generated bucket:', newBucket);
      console.log('CreateTableForm: Generated base_path:', newBasePath);
      
      setFormData(prev => ({
        ...prev,
        bucket: newBucket,
        base_path: newBasePath
      }));
    }
  }, [formData.table_name, formData.namespace]);

  // Get selected data source info
  const selectedDataSource = dataSources?.find((ds: DataSource) => ds.id === formData.source_id);
  const isIcebergCompatible = selectedDataSource?.type === 'minio' || selectedDataSource?.type === 'iceberg';

  const { data: namespaces, isLoading: namespacesLoading, error: namespacesError } = useQuery({
    queryKey: ['iceberg-namespaces'],
    queryFn: async () => {
      console.log('CreateTableForm: Fetching namespaces...');
      const token = await authService.getValidToken();
      console.log('CreateTableForm: Got token for namespaces:', !!token);
      const result = await listNamespaces(token || undefined);
      console.log('CreateTableForm: Raw namespaces result:', result);
      console.log('CreateTableForm: Result type:', typeof result, 'Array?', Array.isArray(result));
      
      // Ensure we always return an array of strings
      if (Array.isArray(result)) {
        const stringNamespaces = result.map((ns: any) => {
          if (typeof ns === 'string') {
            return ns;
          } else if (ns && typeof ns === 'object' && 'name' in ns) {
            return ns.name;
          } else {
            console.warn('CreateTableForm: Unexpected namespace format:', ns);
            return String(ns);
          }
        });
        console.log('CreateTableForm: Processed namespaces:', stringNamespaces);
        return stringNamespaces;
      }
      
      console.log('CreateTableForm: Result is not an array, returning empty array');
      return [];
    },
    enabled: isIcebergCompatible, // Only fetch namespaces for Iceberg-compatible sources
  });

  console.log('CreateTableForm: Namespaces query state:', {
    data: namespaces,
    isLoading: namespacesLoading,
    error: namespacesError
  });

  const createTableMutation = useMutation({
    mutationFn: async (dataset: typeof formData & { source_id: number }) => {
      console.log('CreateTableForm: Creating table with dataset:', dataset);
      const token = await authService.getValidToken();
      console.log('CreateTableForm: Got token for creation:', !!token);
      
      // For Iceberg-compatible sources, use the Iceberg endpoint
      if (isIcebergCompatible) {
        const result = await createIcebergDataset(dataset, token || undefined);
        console.log('CreateTableForm: Create Iceberg table result:', result);
        return result;
      } else {
        // For database sources, use the regular dataset endpoint
        const response = await fetch('/api/bi/datasets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: JSON.stringify({
            name: dataset.name,
            description: dataset.description,
            source_id: dataset.source_id,
            query_type: 'table_scan',
            query_definition: dataset.table_name
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to create dataset');
        }
        
        const result = await response.json();
        console.log('CreateTableForm: Create database dataset result:', result);
        return result;
      }
    },
    onSuccess: (data) => {
      console.log('CreateTableForm: Table created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['iceberg-tables'] });
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast({
        title: 'Table created',
        description: isIcebergCompatible 
          ? 'Iceberg table has been successfully created'
          : 'Dataset has been successfully created',
      });
      onSuccess();
    },
    onError: (error) => {
      console.error('CreateTableForm: Error creating table:', error);
      toast({
        variant: 'destructive',
        title: 'Error creating table',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('CreateTableForm: Form submitted with data:', formData);
    
    if (!formData.name || !formData.table_name || !formData.source_id) {
      console.log('CreateTableForm: Validation failed - missing required fields');
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please fill in all required fields',
      });
      return;
    }

    // Additional validation for Iceberg sources
    if (isIcebergCompatible && !formData.namespace) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select a namespace for Iceberg tables',
      });
      return;
    }
    
    console.log('CreateTableForm: About to create dataset with:', formData);
    createTableMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    console.log('CreateTableForm: Input changed -', field, ':', value);
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      console.log('CreateTableForm: Updated formData:', newData);
      return newData;
    });
  };

  console.log('CreateTableForm: About to render form. Selected source:', selectedDataSource);

  return (
    <div>
      <DialogDescription>
        {isIcebergCompatible 
          ? 'Create a new Iceberg table by filling out the form below.'
          : 'Create a new dataset by connecting to an existing database table.'
        }
      </DialogDescription>
      
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div>
          <Label htmlFor="name">Dataset Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter dataset name"
            required
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Enter description"
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="source_id">Data Source *</Label>
          <Select 
            value={formData.source_id.toString()} 
            onValueChange={(value) => handleInputChange('source_id', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select data source" />
            </SelectTrigger>
            <SelectContent>
              {dataSources?.map((source: DataSource) => (
                <SelectItem key={source.id} value={source.id.toString()}>
                  {source.name} ({source.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isIcebergCompatible && (
          <div>
            <Label htmlFor="namespace">Namespace *</Label>
            <Select value={formData.namespace} onValueChange={(value) => {
              console.log('CreateTableForm: Namespace selected:', value);
              handleInputChange('namespace', value);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select namespace" />
              </SelectTrigger>
              <SelectContent>
                {namespaces && Array.isArray(namespaces) && namespaces.map((namespace) => {
                  console.log('CreateTableForm: Rendering namespace option:', namespace, 'type:', typeof namespace);
                  const namespaceString = String(namespace);
                  return (
                    <SelectItem key={namespaceString} value={namespaceString}>
                      {namespaceString}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label htmlFor="table_name">
            {isIcebergCompatible ? 'Table Name *' : 'Database Table Name *'}
          </Label>
          <Input
            id="table_name"
            value={formData.table_name}
            onChange={(e) => handleInputChange('table_name', e.target.value)}
            placeholder={isIcebergCompatible ? "Enter table name" : "Enter existing database table name"}
            required
          />
        </div>

        {isIcebergCompatible && (
          <>
            <div>
              <Label htmlFor="bucket">Bucket</Label>
              <Input
                id="bucket"
                value={formData.bucket}
                onChange={(e) => handleInputChange('bucket', e.target.value)}
                placeholder="Auto-generated from table name"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Auto-generated based on table name
              </p>
            </div>

            <div>
              <Label htmlFor="base_path">Base Path</Label>
              <Input
                id="base_path"
                value={formData.base_path}
                onChange={(e) => handleInputChange('base_path', e.target.value)}
                placeholder="Auto-generated from table name"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Auto-generated based on namespace and table name
              </p>
            </div>

            <div>
              <Label htmlFor="csv_path">CSV Path</Label>
              <Input
                id="csv_path"
                value={formData.csv_path}
                onChange={(e) => handleInputChange('csv_path', e.target.value)}
                placeholder="Enter CSV path (optional)"
              />
            </div>
          </>
        )}

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={createTableMutation.isPending}>
            {createTableMutation.isPending ? 'Creating...' : 
             isIcebergCompatible ? 'Create Iceberg Table' : 'Create Dataset'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateTableForm;
