
import React from 'react';
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";

// Define form schema
const dataSourceFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  connection_string: z.string().min(1, "Connection string is required"),
  is_active: z.boolean().default(true),
  config: z.string().optional(),
});

type DataSourceFormValues = z.infer<typeof dataSourceFormSchema>;

interface DataSourceFormProps {
  dataSource?: {
    id: number;
    name: string;
    type: string;
    connection_string: string;
    is_active: boolean;
    config?: Record<string, any>;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

const DataSourceForm: React.FC<DataSourceFormProps> = ({ dataSource, onSuccess, onCancel }) => {
  const form = useForm<DataSourceFormValues>({
    resolver: zodResolver(dataSourceFormSchema),
    defaultValues: {
      name: dataSource?.name || "",
      type: dataSource?.type || "postgresql",
      connection_string: dataSource?.connection_string || "",
      is_active: dataSource?.is_active ?? true,
      config: dataSource?.config ? JSON.stringify(dataSource.config, null, 2) : "{}",
    },
  });

  const onSubmit = async (values: DataSourceFormValues) => {
    try {
      let configObj = {};
      
      try {
        configObj = values.config ? JSON.parse(values.config) : {};
      } catch (e) {
        toast({
          variant: "destructive",
          title: "Invalid JSON",
          description: "Config contains invalid JSON",
        });
        return;
      }

      const apiUrl = dataSource?.id 
        ? `/api/bi/data-sources/${dataSource.id}` 
        : '/api/bi/data-sources';
      
      const method = dataSource?.id ? 'PUT' : 'POST';
      
      const response = await fetch(apiUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: values.name,
          type: values.type,
          connection_string: values.connection_string,
          is_active: values.is_active,
          config: configObj,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save data source');
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
    }
  };

  return (
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
                  <SelectItem value="postgresql">PostgreSQL</SelectItem>
                  <SelectItem value="mysql">MySQL</SelectItem>
                  <SelectItem value="sqlite">SQLite</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
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
                <Input placeholder="e.g., postgresql://user:password@localhost:5432/database" {...field} />
              </FormControl>
              <FormDescription>
                {form.watch("type") === "postgresql" && "Format: postgresql://user:password@host:port/database"}
                {form.watch("type") === "mysql" && "Format: mysql://user:password@host:port/database"}
                {form.watch("type") === "sqlite" && "Format: sqlite:///path/to/database.db"}
                {form.watch("type") === "csv" && "Path to CSV file"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="config"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Configuration (JSON)</FormLabel>
              <FormControl>
                <Textarea placeholder="{}" className="font-mono min-h-[100px]" {...field} />
              </FormControl>
              <FormDescription>
                Additional configuration options in JSON format
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active</FormLabel>
                <FormDescription>
                  Whether this data source is active and available for use
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {dataSource?.id ? "Update Data Source" : "Create Data Source"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default DataSourceForm;
