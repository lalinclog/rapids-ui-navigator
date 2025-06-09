
import React, { useState } from 'react';
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

interface CreateTableFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const CreateTableForm: React.FC<CreateTableFormProps> = ({ onSuccess, onCancel }) => {
  console.log('CreateTableForm: Component rendered with props:', { onSuccess, onCancel });
  
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    namespace: '',
    table_name: '',
    bucket: '',
    base_path: '',
    csv_path: ''
  });

  console.log('CreateTableForm: Initial formData state:', formData);

  // Use listNamespaces from iceberg.ts instead of getIcebergNamespaces from datasets.ts
  const { data: namespaces, isLoading: namespacesLoading, error: namespacesError } = useQuery({
    queryKey: ['iceberg-namespaces'],
    queryFn: async () => {
      console.log('CreateTableForm: Fetching namespaces...');
      const token = await authService.getValidToken();
      console.log('CreateTableForm: Got token for namespaces:', !!token);
      const result = await listNamespaces(token || undefined);
      console.log('CreateTableForm: Namespaces result:', result);
      return result;
    },
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
      const result = await createIcebergDataset(dataset, token || undefined);
      console.log('CreateTableForm: Create table result:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('CreateTableForm: Table created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['iceberg-tables'] });
      toast({
        title: 'Table created',
        description: 'Iceberg table has been successfully created',
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
    
    if (!formData.name || !formData.namespace || !formData.table_name) {
      console.log('CreateTableForm: Validation failed - missing required fields');
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please fill in all required fields',
      });
      return;
    }

    const datasetToCreate = {
      ...formData,
      source_id: 1, // Default source ID - adjust as needed
    };
    
    console.log('CreateTableForm: About to create dataset with:', datasetToCreate);
    createTableMutation.mutate(datasetToCreate);
  };

  const handleInputChange = (field: string, value: string) => {
    console.log('CreateTableForm: Input changed -', field, ':', value);
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      console.log('CreateTableForm: Updated formData:', newData);
      return newData;
    });
  };

  console.log('CreateTableForm: About to render form. Namespaces available:', namespaces);

  return (
    <div>
      <DialogDescription>
        Create a new Iceberg table by filling out the form below.
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
                console.log('CreateTableForm: Rendering namespace option:', namespace);
                // Ensure we're working with strings
                const namespaceString = typeof namespace === 'string' ? namespace : namespace;
                return (
                  <SelectItem key={namespaceString} value={namespaceString}>
                    {namespaceString}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="table_name">Table Name *</Label>
          <Input
            id="table_name"
            value={formData.table_name}
            onChange={(e) => handleInputChange('table_name', e.target.value)}
            placeholder="Enter table name"
            required
          />
        </div>

        <div>
          <Label htmlFor="bucket">Bucket</Label>
          <Input
            id="bucket"
            value={formData.bucket}
            onChange={(e) => handleInputChange('bucket', e.target.value)}
            placeholder="Enter bucket name"
          />
        </div>

        <div>
          <Label htmlFor="base_path">Base Path</Label>
          <Input
            id="base_path"
            value={formData.base_path}
            onChange={(e) => handleInputChange('base_path', e.target.value)}
            placeholder="Enter base path"
          />
        </div>

        <div>
          <Label htmlFor="csv_path">CSV Path</Label>
          <Input
            id="csv_path"
            value={formData.csv_path}
            onChange={(e) => handleInputChange('csv_path', e.target.value)}
            placeholder="Enter CSV path"
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={createTableMutation.isPending}>
            {createTableMutation.isPending ? 'Creating...' : 'Create Table'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateTableForm;
