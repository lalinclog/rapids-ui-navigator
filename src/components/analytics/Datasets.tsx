
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Database, Plus, Table } from 'lucide-react';

interface Dataset {
  id: number;
  name: string;
  description: string;
  source_id: number;
  source_name: string;
  query_type: string;
  created_at: string;
  updated_at: string;
  last_refreshed_at: string | null;
}

const fetchDatasets = async (): Promise<Dataset[]> => {
  const response = await fetch('/api/bi/datasets');
  if (!response.ok) {
    throw new Error('Failed to fetch datasets');
  }
  return response.json();
};

const DatasetCard: React.FC<{ dataset: Dataset }> = ({ dataset }) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{dataset.name}</CardTitle>
            <CardDescription className="line-clamp-1">
              {dataset.description || "No description"}
            </CardDescription>
          </div>
          <Badge variant="outline">
            {dataset.query_type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="text-sm mb-2">
          <span className="font-medium text-muted-foreground">Source:</span>{' '}
          {dataset.source_name}
        </div>
        {dataset.last_refreshed_at && (
          <div className="text-xs text-muted-foreground">
            Last refreshed: {new Date(dataset.last_refreshed_at).toLocaleString()}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2 flex justify-between">
        <Button variant="outline" size="sm">Edit</Button>
        <Button variant="ghost" size="sm">Preview Data</Button>
      </CardFooter>
    </Card>
  );
};

const Datasets: React.FC = () => {
  const { data: datasets, isLoading, error } = useQuery({
    queryKey: ['datasets'],
    queryFn: fetchDatasets
  });

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Datasets</h2>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" /> Add Dataset
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="h-full flex flex-col">
              <CardHeader>
                <Skeleton className="h-5 w-2/3 mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent className="flex-grow">
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-3 w-1/3" />
              </CardContent>
              <CardFooter className="pt-2 flex justify-between">
                <Skeleton className="h-9 w-16" />
                <Skeleton className="h-9 w-28" />
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
        Error loading datasets: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Datasets</h2>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Dataset
        </Button>
      </div>
      
      {datasets && datasets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {datasets.map((dataset) => (
            <DatasetCard key={dataset.id} dataset={dataset} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="bg-muted h-12 w-12 rounded-full flex items-center justify-center mb-4">
            <Table className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No Datasets</h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            Create your first dataset to start building visualizations.
          </p>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Create Your First Dataset
          </Button>
        </div>
      )}
    </div>
  );
};

export default Datasets;
