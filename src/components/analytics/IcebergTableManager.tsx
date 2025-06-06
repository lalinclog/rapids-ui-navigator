
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Eye, Database, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import AuthService from '@/services/AuthService';

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

const IcebergTableManager = () => {
  const { toast } = useToast();
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [newTable, setNewTable] = useState({
    name: '',
    bucket: 'iceberg-warehouse',
    parquet_path: '',
    base_path: ''
  });

  useEffect(() => {
    fetchNamespaces();
  }, []);

  useEffect(() => {
    if (selectedNamespace) {
      fetchTables(selectedNamespace);
    }
  }, [selectedNamespace]);

  const fetchNamespaces = async () => {
    setLoading(true);
    try {
      const token = await AuthService.getValidToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const response = await axios.get('/api/iceberg/namespaces', { headers });
      setNamespaces(response.data.namespaces || []);
    } catch (error) {
      console.error('Error fetching namespaces:', error);
      toast({
        title: "Error",
        description: "Failed to load namespaces",
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
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const response = await axios.get(`/api/iceberg/namespaces/${namespace}/tables`, { headers });
      setTables(response.data.tables || []);
      setSelectedTable('');
      setTableInfo(null);
      setTableData(null);
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast({
        title: "Error",
        description: "Failed to load tables",
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
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

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
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

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
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

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
      setNewTable({ name: '', bucket: 'iceberg-warehouse', parquet_path: '', base_path: '' });
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
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

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
          <Select value={selectedNamespace} onValueChange={setSelectedNamespace}>
            <SelectTrigger>
              <SelectValue placeholder="Select a namespace" />
            </SelectTrigger>
            <SelectContent>
              {namespaces.map(namespace => (
                <SelectItem key={namespace} value={namespace}>
                  {namespace}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Create Table Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Table</CardTitle>
            <CardDescription>Create an Iceberg table from Parquet files</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <Label htmlFor="bucket">Bucket</Label>
              <Input
                id="bucket"
                value={newTable.bucket}
                onChange={(e) => setNewTable(prev => ({ ...prev, bucket: e.target.value }))}
                placeholder="iceberg-warehouse"
              />
            </div>

            <div>
              <Label htmlFor="parquet-path">Parquet File Path *</Label>
              <Input
                id="parquet-path"
                value={newTable.parquet_path}
                onChange={(e) => setNewTable(prev => ({ ...prev, parquet_path: e.target.value }))}
                placeholder="e.g., electric_vehicles/johannesburg_ev_charging_2024_2025.parquet"
              />
              <p className="text-sm text-gray-500 mt-1">
                Path to the Parquet file(s) within the bucket
              </p>
            </div>

            <div>
              <Label htmlFor="base-path">Base Path (optional)</Label>
              <Input
                id="base-path"
                value={newTable.base_path}
                onChange={(e) => setNewTable(prev => ({ ...prev, base_path: e.target.value }))}
                placeholder="Optional base path prefix"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTable} disabled={loading}>
                {loading ? 'Creating...' : 'Create Table'}
              </Button>
            </div>
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
              <p className="text-gray-500">No tables found in this namespace</p>
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
              <p className="text-sm bg-gray-100 p-2 rounded">{tableInfo.location}</p>
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
                <p className="text-sm bg-gray-100 p-2 rounded">{tableInfo.snapshot_id}</p>
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
                        <span className="text-xs text-gray-500">({column.type})</span>
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
                            : <span className="text-gray-400">null</span>
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
