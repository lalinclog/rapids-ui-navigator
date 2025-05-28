
import React, { useState } from 'react';
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';

// Define form schema
const dataSourceFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  description: z.string().optional(),
  connection_string: z.string().min(1, "Connection string is required"),
  config: z.string().optional(),
});

type DataSourceFormValues = z.infer<typeof dataSourceFormSchema>;

interface DataSourceFormProps {
  dataSource?: {
    id: number;
    name: string;
    type: string;
    description?: string;
    connection_string: string;
    config?: Record<string, any>;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

const DATA_SOURCE_TYPES = [
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'minio', label: 'MinIO' },
  { value: 'sqlserver', label: 'SQL Server' },
  { value: 'oracle', label: 'Oracle' },
];

const DataSourceForm: React.FC<DataSourceFormProps> = ({ dataSource, onSuccess, onCancel }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<DataSourceFormValues>({
    resolver: zodResolver(dataSourceFormSchema),
    defaultValues: {
      name: dataSource?.name || "",
      type: dataSource?.type || "",
      description: dataSource?.description || "",
      connection_string: dataSource?.connection_string || "",
      config: dataSource?.config ? JSON.stringify(dataSource.config, null, 2) : "",
    },
  });

  const selectedType = form.watch("type");

  const getConnectionStringPlaceholder = () => {
    switch (selectedType) {
      case 'postgresql':
        return 'postgresql://username:password@host:port/database';
      case 'mysql':
        return 'mysql://username:password@host:port/database';
      case 'minio':
        return 'endpoint:port:access_key:secret_key:secure';
      case 'sqlserver':
        return 'mssql://username:password@host:port/database';
      case 'oracle':
        return 'oracle://username:password@host:port/database';
      default:
        return 'Connection string format depends on the data source type';
    }
  };

  const getConnectionStringHelp = () => {
    switch (selectedType) {
      case 'minio':
        return 'Format: endpoint:port:access_key:secret_key:secure (e.g., localhost:9000:minioadmin:minioadmin:false)';
      case 'postgresql':
        return 'Standard PostgreSQL connection string';
      case 'mysql':
        return 'Standard MySQL connection string';
      default:
        return 'Enter the connection string for your data source';
    }
  };

  const onSubmit = async (values: DataSourceFormValues) => {
    setIsSubmitting(true);
    try {
      const apiUrl = dataSource?.id 
        ? `/api/bi/data-sources/${dataSource.id}` 
        : '/api/bi/data-sources';
      
      const method = dataSource?.id ? 'PUT' : 'POST';
      
      let config = {};
      if (values.config) {
        try {
          config = JSON.parse(values.config);
        } catch (error) {
          throw new Error('Invalid JSON in configuration field');
        }
      }

      const response = await fetch(apiUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          config,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to save data source');
      }

      const result = await response.json();
      toast({
        title: dataSource?.id ? "Data source updated" : "Data source created",
        description: `Successfully ${dataSource?.id ? 'updated' : 'created'} data source ${values.name}`,
      });

      onSuccess();
    } catch (error) {
      console.error('Error saving data source:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save data source",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {dataSource?.id ? "Edit Data Source" : "Create New Data Source"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Data source name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select data source type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DATA_SOURCE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Data source description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="connection_string"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Connection String</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={getConnectionStringPlaceholder()}
                      {...field} 
                    />
                  </FormControl>
                  <div className="text-xs text-muted-foreground">
                    {getConnectionStringHelp()}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="config"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Configuration (JSON)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder='{"timeout": 30, "ssl": true}'
                      className="font-mono min-h-[100px]" 
                      {...field} 
                    />
                  </FormControl>
                  <div className="text-xs text-muted-foreground">
                    Optional JSON configuration for additional settings
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {dataSource?.id ? "Update Data Source" : "Create Data Source"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default DataSourceForm;
