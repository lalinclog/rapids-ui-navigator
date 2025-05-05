
import React from 'react';
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

// Define form schema
const dashboardFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  is_public: z.boolean().default(false),
});

type DashboardFormValues = z.infer<typeof dashboardFormSchema>;

interface DashboardFormProps {
  dashboard?: {
    id: number;
    name: string;
    description: string | null;
    is_public: boolean;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

const DashboardForm: React.FC<DashboardFormProps> = ({ dashboard, onSuccess, onCancel }) => {
  const form = useForm<DashboardFormValues>({
    resolver: zodResolver(dashboardFormSchema),
    defaultValues: {
      name: dashboard?.name || "",
      description: dashboard?.description || "",
      is_public: dashboard?.is_public || false,
    },
  });

  const onSubmit = async (values: DashboardFormValues) => {
    try {
      const apiUrl = dashboard?.id 
        ? `/api/bi/dashboards/${dashboard.id}` 
        : '/api/bi/dashboards';
      
      const method = dashboard?.id ? 'PUT' : 'POST';
      
      const response = await fetch(apiUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error('Failed to save dashboard');
      }

      const result = await response.json();
      toast({
        title: dashboard?.id ? "Dashboard updated" : "Dashboard created",
        description: `Successfully ${dashboard?.id ? 'updated' : 'created'} dashboard ${values.name}`,
      });

      onSuccess();
    } catch (error) {
      console.error('Error saving dashboard:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save dashboard",
      });
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Dashboard name" {...field} />
                  </FormControl>
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
                    <Textarea placeholder="Dashboard description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_public"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Public Dashboard</FormLabel>
                    <FormDescription>
                      Make this dashboard viewable by anyone with the link
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
                {dashboard?.id ? "Update Dashboard" : "Create Dashboard"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default DashboardForm;
