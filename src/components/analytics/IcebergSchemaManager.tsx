
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Database } from 'lucide-react';
import { getTableDetails, updateTableSchema, SchemaColumn, SchemaUpdate } from '../../../nextjs-app/lib/api/iceberg';

interface SchemaManagerProps {
  namespace: string;
  tableName: string;
}

const SchemaManager: React.FC<SchemaManagerProps> = ({ namespace, tableName }) => {
  const queryClient = useQueryClient();
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [newColumn, setNewColumn] = useState({
    name: '',
    type: 'string',
    nullable: true,
    description: ''
  });

  const { data: tableDetails, isLoading } = useQuery({
    queryKey: ['table-details', namespace, tableName],
    queryFn: () => getTableDetails(namespace, tableName),
  });

  const updateSchemaMutation = useMutation({
    mutationFn: (updates: SchemaUpdate[]) => 
      updateTableSchema({ namespace, table_name: tableName, updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-details', namespace, tableName] });
      toast({
        title: 'Schema updated',
        description: 'Table schema has been successfully updated',
      });
      setIsAddColumnOpen(false);
      setNewColumn({ name: '', type: 'string', nullable: true, description: '' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error updating schema',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  });

  const handleAddColumn = () => {
    if (!newColumn.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Column name is required',
      });
      return;
    }

    const update: SchemaUpdate = {
      action: 'add-column',
      column: {
        name: newColumn.name,
        type: newColumn.type,
        nullable: newColumn.nullable,
        description: newColumn.description || undefined
      }
    };

    updateSchemaMutation.mutate([update]);
  };

  const handleDropColumn = (columnName: string) => {
    if (confirm(`Are you sure you want to drop column "${columnName}"?`)) {
      const update: SchemaUpdate = {
        action: 'drop-column',
        old_name: columnName
      };
      updateSchemaMutation.mutate([update]);
    }
  };

  if (isLoading) {
    return <div>Loading schema information...</div>;
  }

  const schema = tableDetails?.schema;
  if (!schema) {
    return <div>No schema information available</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Database className="h-5 w-5" />
            Schema Management
          </h3>
          <p className="text-muted-foreground">
            Manage the schema for {namespace}.{tableName}
          </p>
        </div>
        <Button onClick={() => setIsAddColumnOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Column
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Schema</CardTitle>
          <CardDescription>
            {schema.columns.length} columns defined
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {schema.columns.map((column: SchemaColumn) => (
              <div key={column.field_id || column.name} 
                   className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{column.name}</span>
                    <Badge variant="outline">{column.type}</Badge>
                    {!column.nullable && <Badge variant="secondary">NOT NULL</Badge>}
                  </div>
                  {column.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {column.description}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDropColumn(column.name)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddColumnOpen} onOpenChange={setIsAddColumnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Column</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="column-name">Column Name</Label>
              <Input
                id="column-name"
                value={newColumn.name}
                onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
                placeholder="Enter column name"
              />
            </div>
            
            <div>
              <Label htmlFor="column-type">Data Type</Label>
              <Select 
                value={newColumn.type} 
                onValueChange={(value) => setNewColumn({ ...newColumn, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">String</SelectItem>
                  <SelectItem value="bigint">BigInt</SelectItem>
                  <SelectItem value="int">Integer</SelectItem>
                  <SelectItem value="double">Double</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="timestamp">Timestamp</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="decimal">Decimal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="nullable"
                checked={newColumn.nullable}
                onChange={(e) => setNewColumn({ ...newColumn, nullable: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="nullable">Allow NULL values</Label>
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={newColumn.description}
                onChange={(e) => setNewColumn({ ...newColumn, description: e.target.value })}
                placeholder="Enter column description"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAddColumnOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddColumn}
                disabled={updateSchemaMutation.isPending}
              >
                {updateSchemaMutation.isPending ? 'Adding...' : 'Add Column'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SchemaManager;
