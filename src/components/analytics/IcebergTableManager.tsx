import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Eye, Database, FileText, Info, Layers, Archive, Upload, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import AuthService from '@/services/AuthService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

interface TableInfo {
  identifier: string;
  schema: {
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
      field_id: number;
    }>;
  };
  location: string;
  snapshot_id: string | null;
  metadata_location: string;
}

interface TableData {
  columns: Array<{
    name: string;
    type: string;
  }>;
  sample_data: Record<string, any>[];
  total_rows: number;
}

interface NamespaceInfo {
  name: string;
  properties: {
    warehouse?: string;
    bucket?: string;
  };
}

interface SchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
}

const IcebergTableManager = () => {
  const { toast } = useToast();
  const [namespaces, setNamespaces] = useState<NamespaceInfo[]>([]);
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');
  const [selectedNamespaceInfo, setSelectedNamespaceInfo] = useState<NamespaceInfo | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [createMode, setCreateMode] = useState<'empty' | 'from_parquet'>('empty');
  
  const [newTable, setNewTable] = useState({
    name: '',
    bucket: '',
    parquet_path: '',
    base_path: ''
  });

  const [emptyTableConfig, setEmptyTableConfig] = useState({
    name: '',
    bucket: '',
    schema: [
      { name: 'id', type: 'bigint', nullable: false },
      { name: 'name', type: 'string', nullable: true },
      { name: 'created_at', type: 'timestamp', nullable: true }
    ] as SchemaColumn[]
  });

  useEffect(() => {
    fetchNamespaces();
  }, []);

  useEffect(() => {
    if (selectedNamespace) {
      fetchTables(selectedNamespace);
      // Find the selected namespace info and set bucket automatically
      const namespaceInfo = namespaces.find(ns => ns.name === selectedNamespace);
      setSelectedNamespaceInfo(namespaceInfo || null);
      if (namespaceInfo) {
        setNewTable(prev => ({
          ...prev,
          bucket: namespaceInfo.properties.bucket || namespaceInfo.properties.warehouse || 'iceberg-warehouse',
          parquet_path: `${selectedNamespace}/`
        }));
        setEmptyTableConfig(prev => ({
          ...prev,
          bucket: namespaceInfo.properties.bucket || namespaceInfo.properties.warehouse || 'iceberg-warehouse'
        }));
      }
    }
  }, [selectedNamespace, namespaces]);

  const fetchNamespaces = async () => {
    setLoading(true);
    try {
      const token = await AuthService.getValidToken();
      if (!token) {
        throw new Error('No valid token available');
      }
      
      const headers = { Authorization: `Bearer ${token}` };
      console.log('Fetching namespaces with token');

      const response = await axios.get('/api/iceberg/namespaces', { headers });
      console.log('Namespaces response:', response.data);
      
      // Transform the response to ensure proper format
      const namespacesWithInfo = response.data.namespaces?.map((ns: any) => {
        // Ensure we have a proper object structure
        if (typeof ns === 'string') {
          return {
            name: ns,
            properties: {}
          };
        } else if (ns && typeof ns === 'object') {
          return {
            name: ns.name || '',
            properties: ns.properties || {}
          };
        } else {
          console.warn('Invalid namespace format:', ns);
          return {
            name: 'unknown',
            properties: {}
          };
        }
      }) || [];
      
      console.log('Processed namespaces:', namespacesWithInfo);
      setNamespaces(namespacesWithInfo);
    } catch (error) {
      console.error('Error fetching namespaces:', error);
      toast({
        title: "Error",
        description: "Failed to load namespaces. Please check your authentication.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = async (namespace: string) => {
    setLoading(true);
    try {
      const token = await AuthService.getValidToken();
      if (!token) {
        throw new Error('No valid token available');
      }
      
      const headers = { Authorization: `Bearer ${token}` };
      console.log('Fetching tables for namespace:', namespace);

      const response = await axios.get(`/api/iceberg/namespaces/${namespace}/tables`, { headers });
      console.log('Tables response:', response.data);
      
      setTables(response.data.tables || []);
      setSelectedTable('');
      setTableInfo(null);
      setTableData(null);
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast({
        title: "Error",
        description: "Failed to load tables. Please check your authentication.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTableInfo = async (namespace: string, tableName: string) => {
    setLoading(true);
    try {
      const token = await AuthService.getValidToken();
      if (!token) {
        throw new Error('No valid token available');
      }
      
      const headers = { Authorization: `Bearer ${token}` };

      const response = await axios.get(`/api/iceberg/namespaces/${namespace}/tables/${tableName}`, { headers });
      setTableInfo(response.data);
      setSelectedTable(tableName);
    } catch (error) {
      console.error('Error fetching table info:', error);
      toast({
        title: "Error",
        description: "Failed to load table information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const previewTableData = async (namespace: string, tableName: string) => {
    setLoading(true);
    try {
      const token = await AuthService.getValidToken();
      if (!token) {
        throw new Error('No valid token available');
      }
      
      const headers = { Authorization: `Bearer ${token}` };

      const response = await axios.get(
        `/api/iceberg/namespaces/${namespace}/tables/${tableName}/preview?limit=100`, 
        { headers }
      );
      setTableData(response.data);
      setShowPreview(true);
    } catch (error) {
      console.error('Error previewing table data:', error);
      toast({
        title: "Error",
        description: "Failed to preview table data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmptyTable = async () => {
    if (!selectedNamespace || !emptyTableConfig.name || emptyTableConfig.schema.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in table name and define at least one column",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const token = await AuthService.getValidToken();
      if (!token) {
        throw new Error('No valid token available');
      }
      
      const headers = { Authorization: `Bearer ${token}` };

      const response = await axios.post('/api/iceberg/tables/empty', {
        namespace: selectedNamespace,
        table_name: emptyTableConfig.name,
        bucket: emptyTableConfig.bucket,
        schema: emptyTableConfig.schema
      }, { headers });

      toast({
        title: "Success",
        description: `Empty table "${emptyTableConfig.name}" created successfully`,
      });

      fetchTables(selectedNamespace);
      setShowCreateForm(false);
      setEmptyTableConfig({
        name: '',
        bucket: selectedNamespaceInfo?.properties.bucket || 'iceberg-warehouse',
        schema: [
          { name: 'id', type: 'bigint', nullable: false },
          { name: 'name', type: 'string', nullable: true },
          { name: 'created_at', type: 'timestamp', nullable: true }
        ]
      });
    } catch (error: any) {
      console.error('Error creating empty table:', error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || 'Failed to create empty table',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTable = async () => {
    if (!selectedNamespace || !newTable.name || !newTable.parquet_path) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const token = await AuthService.getValidToken();
      if (!token) {
        throw new Error('No valid token available');
      }
      
      const headers = { Authorization: `Bearer ${token}` };

      const response = await axios.post('/api/iceberg/tables', {
        namespace: selectedNamespace,
        table_name: newTable.name,
        bucket: newTable.bucket,
        parquet_path: newTable.parquet_path,
        base_path: newTable.base_path || null
      }, { headers });

      toast({
        title: "Success",
        description: `Table "${newTable.name}" created successfully`,
      });

      fetchTables(selectedNamespace);
      setShowCreateForm(false);
      setNewTable({ 
        name: '', 
        bucket: selectedNamespaceInfo?.properties.bucket || 'iceberg-warehouse', 
        parquet_path: `${selectedNamespace}/`, 
        base_path: '' 
      });
    } catch (error: any) {
      console.error('Error creating table:', error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || 'Failed to create table',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTable = async (namespace: string, tableName: string) => {
    if (window.confirm(`Are you sure you want to delete table "${tableName}"?`)) {
      setLoading(true);
      try {
        const token = await AuthService.getValidToken();
        if (!token) {
          throw new Error('No valid token available');
        }
        
        const headers = { Authorization: `Bearer ${token}` };

        await axios.delete(`/api/iceberg/namespaces/${namespace}/tables/${tableName}`, { headers });
        
        toast({
          title: "Success",
          description: `Table "${tableName}" deleted successfully`,
        });

        fetchTables(namespace);
        if (selectedTable === tableName) {
          setSelectedTable('');
          setTableInfo(null);
          setTableData(null);
        }
      } catch (error: any) {
        console.error('Error deleting table:', error);
        toast({
          title: "Error",
          description: error.response?.data?.detail || 'Failed to delete table',
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const addSchemaColumn = () => {
    setEmptyTableConfig(prev => ({
      ...prev,
      schema: [...prev.schema, { name: '', type: 'string', nullable: true }]
    }));
  };

  const removeSchemaColumn = (index: number) => {
    setEmptyTableConfig(prev => ({
      ...prev,
      schema: prev.schema.filter((_, i) => i !== index)
    }));
  };

  const updateSchemaColumn = (index: number, field: keyof SchemaColumn, value: any) => {
    setEmptyTableConfig(prev => ({
      ...prev,
      schema: prev.schema.map((col, i) => 
        i === index ? { ...col, [field]: value } : col
      )
    }));
  };

  const getPathExamples = (namespace: string) => [
    {
      icon: <Archive className="h-4 w-4" />,
      type: "Multi-file Dataset",
      description: "All Parquet files in folder",
      path: `${namespace}/`,
      note: "Iceberg will discover and manage all .parquet files in the folder",
      useCase: "Best for: Multiple data files that form one logical table"
    },
    {
      icon: <FileText className="h-4 w-4" />,
      type: "Single File",
      description: "Specific Parquet file",
      path: `${namespace}/johannesburg_ev_charging_2024_2025.parquet`,
      note: "Start with one file, add more later through Iceberg operations",
      useCase: "Best for: Starting with one file, expanding later"
    },
    {
      icon: <Layers className="h-4 w-4" />,
      type: "Hive-style Partitioning",
      description: "Partitioned by year",
      path: `${namespace}/year=2024/`,
      note: "Iceberg will recognize partition structure and optimize queries",
      useCase: "Best for: Time-series data partitioned by year"
    },
    {
      icon: <Layers className="h-4 w-4" />,
      type: "Multi-level Partitioning",
      description: "Partitioned by year and month",
      path: `${namespace}/year=2024/month=*/`,
      note: "Use wildcards (*) to include multiple partitions at once",
      useCase: "Best for: Fine-grained time partitioning"
    },
    {
      icon: <Database className="h-4 w-4" />,
      type: "Regional Partitioning",
      description: "Partitioned by location",
      path: `${namespace}/region=*/`,
      note: "Geographic or categorical partitioning for query optimization",
      useCase: "Best for: Data partitioned by geographic regions or categories"
    },
    {
      icon: <Layers className="h-4 w-4" />,
      type: "Complex Partitioning",
      description: "Multiple partition levels",
      path: `${namespace}/region=*/year=*/month=*/`,
      note: "Nested partitioning for maximum query performance",
      useCase: "Best for: Large datasets with multiple partition dimensions"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Iceberg Tables</h2>
        <Button 
          onClick={() => setShowCreateForm(true)} 
          className="flex items-center gap-2"
          disabled={!selectedNamespace}
        >
          <Plus className="h-4 w-4" />
          Create Table
        </Button>
      </div>

      {/* Namespace Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Namespace</CardTitle>
          <CardDescription>Choose a namespace to manage its tables</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Select value={selectedNamespace} onValueChange={setSelectedNamespace}>
              <SelectTrigger>
                <SelectValue placeholder="Select a namespace" />
              </SelectTrigger>
              <SelectContent>
                {namespaces.map(namespace => (
                  <SelectItem key={namespace.name} value={namespace.name}>
                    {namespace.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedNamespaceInfo && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4" />
                  <span className="font-medium">Namespace Details</span>
                </div>
                <div className="text-sm space-y-1">
                  <p><strong>Bucket:</strong> {selectedNamespaceInfo.properties.bucket || selectedNamespaceInfo.properties.warehouse || 'iceberg-warehouse'}</p>
                  {selectedNamespaceInfo.properties.warehouse && (
                    <p><strong>Warehouse:</strong> {selectedNamespaceInfo.properties.warehouse}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Table Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Iceberg Table</CardTitle>
            <CardDescription>
              Choose how to create your Iceberg table: start with an empty table or create from existing Parquet files.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={createMode} onValueChange={(value) => setCreateMode(value as 'empty' | 'from_parquet')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="empty" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Empty Table
                </TabsTrigger>
                <TabsTrigger value="from_parquet" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  From Parquet
                </TabsTrigger>
              </TabsList>

              <TabsContent value="empty" className="space-y-4 mt-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-blue-800">Empty Table Benefits:</p>
                      <ul className="text-xs text-blue-700 space-y-1">
                        <li>• <strong>Schema first:</strong> Define your table structure upfront</li>
                        <li>• <strong>Data loading flexibility:</strong> Load data later via API, streaming, or batch</li>
                        <li>• <strong>Evolution ready:</strong> Easy to modify schema as requirements change</li>
                        <li>• <strong>Integration friendly:</strong> Perfect for ETL pipelines and data ingestion</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="empty-table-name">Table Name *</Label>
                  <Input
                    id="empty-table-name"
                    value={emptyTableConfig.name}
                    onChange={(e) => setEmptyTableConfig(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., customer_events"
                  />
                </div>

                <div>
                  <Label htmlFor="empty-bucket">Bucket (auto-set from namespace)</Label>
                  <Input
                    id="empty-bucket"
                    value={emptyTableConfig.bucket}
                    disabled={true}
                    className="bg-muted"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>Table Schema *</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addSchemaColumn}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Column
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {emptyTableConfig.schema.map((column, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-4">
                          <Input
                            placeholder="Column name"
                            value={column.name}
                            onChange={(e) => updateSchemaColumn(index, 'name', e.target.value)}
                          />
                        </div>
                        <div className="col-span-3">
                          <Select 
                            value={column.type} 
                            onValueChange={(value) => updateSchemaColumn(index, 'type', value)}
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
                        <div className="col-span-3 flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={column.nullable}
                            onChange={(e) => updateSchemaColumn(index, 'nullable', e.target.checked)}
                            className="rounded"
                          />
                          <span className="text-sm">Nullable</span>
                        </div>
                        <div className="col-span-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeSchemaColumn(index)}
                            disabled={emptyTableConfig.schema.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateEmptyTable} disabled={loading}>
                    {loading ? 'Creating...' : 'Create Empty Table'}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="from_parquet" className="space-y-4 mt-6">
                <div>
                  <Label htmlFor="table-name">Table Name *</Label>
                  <Input
                    id="table-name"
                    value={newTable.name}
                    onChange={(e) => setNewTable(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., ev_charging_stations"
                  />
                </div>

                <div>
                  <Label htmlFor="bucket">Bucket (auto-set from namespace)</Label>
                  <Input
                    id="bucket"
                    value={newTable.bucket}
                    onChange={(e) => setNewTable(prev => ({ ...prev, bucket: e.target.value }))}
                    placeholder="iceberg-warehouse"
                    disabled={true}
                    className="bg-muted"
                  />
                </div>

                <div>
                  <Label htmlFor="parquet-path">Parquet Path Pattern *</Label>
                  <Input
                    id="parquet-path"
                    value={newTable.parquet_path}
                    onChange={(e) => setNewTable(prev => ({ ...prev, parquet_path: e.target.value }))}
                    placeholder={`${selectedNamespace}/`}
                  />
                  
                  <div className="text-sm text-muted-foreground mt-4 space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Database className="h-4 w-4" />
                      <span className="font-semibold">Iceberg Table Patterns</span>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                      {getPathExamples(selectedNamespace).map((example, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setNewTable(prev => ({ ...prev, parquet_path: example.path }))}
                          className="text-left p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-border hover:border-primary/20"
                        >
                          <div className="flex items-start gap-3">
                            <div className="text-primary mt-0.5">
                              {example.icon}
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{example.type}</span>
                                <Badge variant="outline" className="text-xs">{example.description}</Badge>
                              </div>
                              <code className="text-blue-600 text-sm block">{example.path}</code>
                              <p className="text-xs text-muted-foreground">{example.note}</p>
                              <p className="text-xs font-medium text-green-700">{example.useCase}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="base-path">Base Path (optional)</Label>
                  <Input
                    id="base-path"
                    value={newTable.base_path}
                    onChange={(e) => setNewTable(prev => ({ ...prev, base_path: e.target.value }))}
                    placeholder="Optional base path prefix"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    If specified, will be prepended to the Parquet path
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTable} disabled={loading}>
                    {loading ? 'Creating...' : 'Create Table'}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Tables List */}
      {selectedNamespace && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Tables in {selectedNamespace}
            </CardTitle>
            <CardDescription>
              {tables.length} table(s) found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading tables...</p>
            ) : tables.length === 0 ? (
              <p className="text-muted-foreground">No tables found in this namespace</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table Name</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tables.map(tableName => (
                    <TableRow key={tableName}>
                      <TableCell className="font-medium">{tableName}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchTableInfo(selectedNamespace, tableName)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Info
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => previewTableData(selectedNamespace, tableName)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteTable(selectedNamespace, tableName)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Table Info */}
      {tableInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Table Information: {selectedTable}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Location</Label>
              <p className="text-sm bg-muted p-2 rounded">{tableInfo.location}</p>
            </div>
            
            <div>
              <Label>Schema</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Column</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Nullable</TableHead>
                    <TableHead>Field ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableInfo.schema.columns.map(column => (
                    <TableRow key={column.field_id}>
                      <TableCell className="font-medium">{column.name}</TableCell>
                      <TableCell>{column.type}</TableCell>
                      <TableCell>
                        <Badge variant={column.nullable ? "secondary" : "destructive"}>
                          {column.nullable ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>{column.field_id}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {tableInfo.snapshot_id && (
              <div>
                <Label>Current Snapshot ID</Label>
                <p className="text-sm bg-muted p-2 rounded">{tableInfo.snapshot_id}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Table Data Preview */}
      {showPreview && tableData && (
        <Card>
          <CardHeader>
            <CardTitle>Data Preview: {selectedTable}</CardTitle>
            <CardDescription>
              Showing {tableData.sample_data.length} of {tableData.total_rows} rows
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {tableData.columns.map(column => (
                      <TableHead key={column.name}>
                        {column.name}
                        <br />
                        <span className="text-xs text-muted-foreground">({column.type})</span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.sample_data.slice(0, 10).map((row, index) => (
                    <TableRow key={index}>
                      {tableData.columns.map(column => (
                        <TableCell key={column.name}>
                          {row[column.name] !== null && row[column.name] !== undefined 
                            ? String(row[column.name]) 
                            : <span className="text-muted-foreground">null</span>
                          }
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Close Preview
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default IcebergTableManager;
