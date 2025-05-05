
import React, { useState }  from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Database, Plus, CheckCircle2, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";


interface DataSource {
  id: number;
  name: string;
  type: string;
  connection_string: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const fetchDataSources = async (): Promise<DataSource[]> => {
  const response = await fetch('/api/bi/data-sources');
  if (!response.ok) {
    throw new Error('Failed to fetch data sources');
  }
  return response.json();
};

interface DataSourceFormProps {
  dataSource?: DataSource;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  title: string;
  submitButtonText: string;
}

const DataSourceForm: React.FC<DataSourceFormProps> = ({ 
  dataSource, 
  onSubmit, 
  onCancel, 
  title, 
  submitButtonText 
}) => {
  const [formData, setFormData] = useState({
    name: dataSource?.name || '',
    type: dataSource?.type || '',
    connection_string: dataSource?.connection_string || '',
    config: dataSource?.config ? JSON.stringify(dataSource.config) : '{}'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    await onSubmit(formData);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          Fill in the details to connect to a data source.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">
            Name
          </Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="type" className="text-right">
            Type
          </Label>
          <Input
            id="type"
            name="type"
            value={formData.type}
            onChange={handleInputChange}
            className="col-span-3"
            placeholder="e.g., postgresql, mysql, etc."
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="connection_string" className="text-right">
            Connection String
          </Label>
          <Input
            id="connection_string"
            name="connection_string"
            value={formData.connection_string}
            onChange={handleInputChange}
            className="col-span-3"
            placeholder="e.g., postgresql://user:password@host:port/database"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="config" className="text-right">
            Config (JSON)
          </Label>
          <Input
            id="config"
            name="config"
            value={formData.config}
            onChange={handleInputChange}
            className="col-span-3"
            placeholder='{"key": "value"}'
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>
          {submitButtonText}
        </Button>
      </div>
    </>
  );
};

const DataSourceCard: React.FC<{ 
  dataSource: DataSource; 
  onEditClick: (dataSource: DataSource) => void; 
  onTestConnection: (dataSource: DataSource) => void;
}> = ({ dataSource, onEditClick, onTestConnection }) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{dataSource.name}</CardTitle>
            <CardDescription>
              {dataSource.type.toUpperCase()}
            </CardDescription>
          </div>
          <Badge variant={dataSource.is_active ? "default" : "outline"}>
            {dataSource.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="text-sm text-muted-foreground mb-2">
          <span className="font-medium">Connection:</span>
          <div className="truncate mt-1 max-w-full">
            {dataSource.connection_string || "No connection string"}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Last updated: {new Date(dataSource.updated_at).toLocaleDateString()}
        </div>
      </CardContent>
      <CardFooter className="pt-2 flex justify-between">
        <Button variant="outline" size="sm" onClick={() => onEditClick(dataSource)}>Edit</Button>
        <Button variant="ghost" size="sm" onClick={() => onTestConnection(dataSource)}>Test Connection</Button>
      </CardFooter>
    </Card>
  );
};

const DataSources: React.FC = () => {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [currentDataSource, setCurrentDataSource] = useState<DataSource | null>(null);

  const { data: dataSources, isLoading, error, refetch } = useQuery({
    queryKey: ['dataSources'],
    queryFn: fetchDataSources,
  });

  const handleAddDataSource = async (formData: any) => {
    try {
      const response = await fetch('/api/bi/data-sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          config: formData.config ? JSON.parse(formData.config) : {},
          created_by: 'admin'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add data source');
      }

      toast({
        title: 'Success',
        description: 'Data source added successfully',
      });
      setIsAddDialogOpen(false);
      refetch();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add data source',
        variant: 'destructive',
      });
    }
  };

  const handleEditDataSource = async (formData: any) => {
    if (!currentDataSource) return;
    
    try {
      const response = await fetch(`/api/bi/data-sources/${currentDataSource.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          config: formData.config ? JSON.parse(formData.config) : {},
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update data source');
      }

      toast({
        title: 'Success',
        description: 'Data source updated successfully',
      });
      setIsEditDialogOpen(false);
      setCurrentDataSource(null);
      refetch();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update data source',
        variant: 'destructive',
      });
    }
  };

  const handleEditClick = (dataSource: DataSource) => {
    setCurrentDataSource(dataSource);
    setIsEditDialogOpen(true);
  };

  const handleTestConnection = async (dataSource: DataSource) => {
    setIsTestingConnection(true);
    
    try {
      const response = await fetch(`/api/bi/data-sources/${dataSource.id}/test-connection`, {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'Connection Successful',
          description: result.message || `Successfully connected to ${dataSource.name}`,
        });
      } else {
        throw new Error(result.error || "Connection failed");
      }
    } catch (error) {
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Could not connect to data source',
        variant: 'destructive',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Data Sources</h2>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" /> Add Data Source
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="h-full flex flex-col">
              <CardHeader>
                <Skeleton className="h-5 w-2/3 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </CardHeader>
              <CardContent className="flex-grow">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-4/5" />
              </CardContent>
              <CardFooter className="pt-2 flex justify-between">
                <Skeleton className="h-9 w-16" />
                <Skeleton className="h-9 w-32" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded-md">
        Error loading data sources: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Data Sources</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Data Source
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DataSourceForm
              onSubmit={handleAddDataSource}
              onCancel={() => setIsAddDialogOpen(false)}
              title="Add New Data Source"
              submitButtonText="Add Data Source"
            />
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          {currentDataSource && (
            <DataSourceForm
              dataSource={currentDataSource}
              onSubmit={handleEditDataSource}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setCurrentDataSource(null);
              }}
              title="Edit Data Source"
              submitButtonText="Update Data Source"
            />
          )}
        </DialogContent>
      </Dialog>
      
      {dataSources && dataSources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dataSources.map((source) => (
            <DataSourceCard 
              key={source.id} 
              dataSource={source} 
              onEditClick={handleEditClick}
              onTestConnection={handleTestConnection}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="bg-muted h-12 w-12 rounded-full flex items-center justify-center mb-4">
            <Database className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No Data Sources</h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            Connect to your first data source to start building analytics.
          </p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Your First Data Source
          </Button>
        </div>
      )}
    </div>
  );
};

export default DataSources;
