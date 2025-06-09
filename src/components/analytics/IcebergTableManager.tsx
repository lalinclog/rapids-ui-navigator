import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Database, Plus, Edit, Trash2, FileText, Eye } from 'lucide-react';
import {
  previewIcebergTable,
} from '@/lib/api/datasets';
import CreateTableForm from './CreateTableForm';
import authService from '@/services/AuthService';

import SchemaManager from './IcebergSchemaManager';
import SnapshotManager from './IcebergSnapshotManager';
import { listNamespaces, listTables, deleteTable, getTableDetails } from '@/lib/api/iceberg';

interface Table {
  name: string;
  namespace: string;
  location: string;
  schema: any;
  current_snapshot_id?: string; // Made optional to match IcebergTable
}

interface NamespaceItem {
  name: string;
  properties?: Record<string, string>;
}

const IcebergTableManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedNamespace, setSelectedNamespace] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<{ namespace: string; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'schema' | 'snapshots'>('overview');

  console.log('IcebergTableManager: Component state:', { selectedNamespace, isCreateDialogOpen });

  const { data: namespacesData, isLoading: isLoadingNamespaces, error: errorNamespaces } = useQuery({
    queryKey: ['iceberg-namespaces'],
    queryFn: async () => {
      const token = await authService.getValidToken();
      const result = await listNamespaces(token || undefined);
      console.log('IcebergTableManager: Namespaces query result:', result);
      
      // Handle both string array and object array responses
      if (Array.isArray(result) && result.length > 0) {
        if (typeof result[0] === 'string') {
          // Convert string array to object array
          return result.map((name: string) => ({ name, properties: {} }));
        } else {
          // Already object array - properly type cast
          return result.map(ns => {
            if (typeof ns === 'string') {
              return { name: ns, properties: {} };
            }
            return ns as NamespaceItem;
          });
        }
      }
      return [];
    },
  });

  // Extract namespace names for other queries
  const namespaces = namespacesData?.map(ns => ns.name) || [];

  const { data: tableNames, isLoading: isLoadingTables, error: errorTables } = useQuery({
    queryKey: ['iceberg-tables', selectedNamespace],
    queryFn: async () => {
      if (!selectedNamespace) return [];
      const token = await authService.getValidToken();
      console.log('Fetching tables for namespace:', selectedNamespace);
      try {
        const result = await listTables(selectedNamespace, token || undefined);
        console.log('Tables result:', result);
        return result || [];
      } catch (error) {
        console.error('Error fetching tables:', error);
        return [];
      }
    },
    enabled: !!selectedNamespace,
  });

  const { data: tables, isLoading: isLoadingTableDetails } = useQuery({
    queryKey: ['iceberg-table-details', selectedNamespace, tableNames],
    queryFn: async () => {
      if (!selectedNamespace || !tableNames || tableNames.length === 0) return [];
      const token = await authService.getValidToken();
      
      const tableDetails = await Promise.all(
        tableNames.map(async (tableName) => {
          try {
            const details = await getTableDetails(selectedNamespace, tableName, token || undefined);
            return details;
          } catch (error) {
            console.error(`Error fetching details for table ${tableName}:`, error);
            return {
              name: tableName,
              namespace: selectedNamespace,
              location: '',
              schema: { columns: [] },
              current_snapshot_id: ''
            };
          }
        })
      );
      
      return tableDetails;
    },
    enabled: !!selectedNamespace && !!tableNames && tableNames.length > 0,
  });

  const deleteTableMutation = useMutation({
    mutationFn: async ({ namespace, tableName }: { namespace: string; tableName: string }) => {
      const token = await authService.getValidToken();
      return await deleteTable(namespace, tableName, token || undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iceberg-tables', selectedNamespace] });
      toast({
        title: 'Table deleted',
        description: 'Iceberg table has been successfully deleted',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error deleting table',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    },
  });

  const previewTableMutation = useMutation({
    mutationFn: async ({ namespace, tableName }: { namespace: string; tableName: string }) => {
      const token = await authService.getValidToken();
      return await previewIcebergTable(namespace, tableName);
    },
    onSuccess: (data) => {
      console.log('Preview data:', data);
      toast({
        title: 'Table previewed',
        description: 'Iceberg table previewed successfully (check console for data)',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error previewing table',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    },
  });

  const handleNamespaceSelect = (namespace: string) => {
    console.log('IcebergTableManager: Namespace selected:', namespace);
    setSelectedNamespace(namespace);
  };

  const handleDelete = (namespace: string, table: Table) => {
    if (confirm(`Are you sure you want to delete the table "${table.name}" in namespace "${namespace}"?`)) {
      deleteTableMutation.mutate({ namespace: namespace, tableName: table.name });
    }
  };

  const handlePreview = (table: Table) => {
    previewTableMutation.mutate({ namespace: selectedNamespace!, tableName: table.name });
  };
  
  const handleViewTable = (namespace: string, tableName: string) => {
    setSelectedTable({ namespace, name: tableName });
    setActiveTab('overview');
  };

  const renderNamespaceList = () => {
    if (isLoadingNamespaces) {
      return <div>Loading namespaces...</div>;
    }

    if (errorNamespaces) {
      return <div>Error loading namespaces: {errorNamespaces.message}</div>;
    }

    if (!namespacesData || namespacesData.length === 0) {
      return <div>No namespaces found.</div>;
    }

    return (
      <div className="space-y-2">
        {namespacesData.map((namespace) => (
          <Button
            key={namespace.name}
            variant={selectedNamespace === namespace.name ? 'secondary' : 'outline'}
            onClick={() => handleNamespaceSelect(namespace.name)}
            className="w-full justify-start"
          >
            {namespace.name}
          </Button>
        ))}
      </div>
    );
  };

  const renderTableList = () => {
    if (!selectedNamespace) {
      return <div>Select a namespace to view tables.</div>;
    }

    if (isLoadingTables || isLoadingTableDetails) {
      return <div>Loading tables...</div>;
    }

    if (errorTables) {
      return <div>Error loading tables: {errorTables.message}</div>;
    }

    if (!tableNames || tableNames.length === 0) {
      return <div>No tables found in the selected namespace.</div>;
    }

    if (!tables || tables.length === 0) {
      return <div>Loading table details...</div>;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tables.map((table) => (
          <Card key={table.name} className="h-full flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-1">
                    <Database className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{table.name}</CardTitle>
                    <CardDescription className="text-sm mt-1">
                      Location: {table.location}
                    </CardDescription>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {selectedNamespace}
                      </Badge>
                      {table.current_snapshot_id && (
                        <Badge variant="secondary" className="text-xs">
                          Snapshot: {table.current_snapshot_id}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardFooter className="pt-3 flex justify-between border-t">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleViewTable(selectedNamespace, table.name)}
                className="flex-1 mr-2"
              >
                <Eye className="h-4 w-4 mr-1" /> View
              </Button>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => handlePreview(table)} className="px-2">
                  <FileText className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleDelete(selectedNamespace, table)} 
                  className="px-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            Iceberg Tables
          </h2>
          <p className="text-muted-foreground">Manage your Iceberg tables</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
          <Plus className="mr-2 h-4 w-4" /> Create Table
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-1">
          <h3 className="text-lg font-semibold mb-4">Namespaces</h3>
          {renderNamespaceList()}
        </div>
        <div className="col-span-3">
          <h3 className="text-lg font-semibold mb-4">Tables</h3>
          {renderTableList()}
        </div>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        console.log('IcebergTableManager: Create dialog open changed:', open);
        setIsCreateDialogOpen(open);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Iceberg Table</DialogTitle>
          </DialogHeader>
          <CreateTableForm 
            selectedNamespace={selectedNamespace || undefined}
            onSuccess={() => {
              console.log('IcebergTableManager: Table creation successful');
              setIsCreateDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ['iceberg-tables', selectedNamespace] });
            }}
            onCancel={() => {
              console.log('IcebergTableManager: Table creation cancelled');
              setIsCreateDialogOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {selectedTable && (
        <Dialog open={!!selectedTable} onOpenChange={() => setSelectedTable(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {selectedTable.namespace}.{selectedTable.name}
              </DialogTitle>
            </DialogHeader>
            
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="schema">Schema</TabsTrigger>
                <TabsTrigger value="snapshots">Snapshots</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview">
                <Card>
                  <CardHeader>
                    <CardTitle>Table Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Namespace</Label>
                        <div className="font-mono">{selectedTable.namespace}</div>
                      </div>
                      <div>
                        <Label>Table Name</Label>
                        <div className="font-mono">{selectedTable.name}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="schema">
                <SchemaManager 
                  namespace={selectedTable.namespace} 
                  tableName={selectedTable.name} 
                />
              </TabsContent>
              
              <TabsContent value="snapshots">
                <SnapshotManager 
                  namespace={selectedTable.namespace} 
                  tableName={selectedTable.name} 
                />
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default IcebergTableManager;
