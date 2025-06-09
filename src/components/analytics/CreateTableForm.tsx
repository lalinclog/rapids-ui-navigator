
import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { createIcebergDataset, getIcebergNamespaces } from '@/lib/api/datasets';
import authService from '@/services/AuthService';

interface CreateTableFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const CreateTableForm: React.FC<CreateTableFormProps> = ({ onSuccess, onCancel }) => {
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

  const { data: namespaces } = useQuery({
    queryKey: ['iceberg-namespaces'],
    queryFn: async () => {
      const token = await authService.getValidToken();
      return getIcebergNamespaces(token || undefined);
    },
  });

  const createTableMutation = useMutation({
    mutationFn: async (dataset: typeof formData & { source_id: number }) => {
      const token = await authService.getValidToken();
      return createIcebergDataset(dataset, token || undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iceberg-tables'] });
      toast({
        title: 'Table created',
        description: 'Iceberg table has been successfully created',
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error creating table',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.namespace || !formData.table_name) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please fill in all required fields',
      });
      return;
    }

    createTableMutation.mutate({
      ...formData,
      source_id: 1, // Default source ID - adjust as needed
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
          <Select value={formData.namespace} onValueChange={(value) => handleInputChange('namespace', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select namespace" />
            </SelectTrigger>
            <SelectContent>
              {namespaces && Array.isArray(namespaces) && namespaces.map((namespace) => (
                <SelectItem key={namespace} value={namespace}>
                  {namespace}
                </SelectItem>
              ))}
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
