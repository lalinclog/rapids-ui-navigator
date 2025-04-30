
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const formSchema = z.object({
  jobName: z.string().min(3, { message: "Job name must be at least 3 characters." }),
  sparkEventLogPath: z.string().min(1, { message: "Event log path is required." }),
  outputFormat: z.enum(["csv", "json", "excel", "html"]).default("html"),
  generateVisualization: z.boolean().default(true),
  filterString: z.string().optional(),
  sparkVersion: z.string().min(1, { message: "Spark version is required." }),
  storageLevel: z.enum(["disk", "memory", "diskAndMemory"]).default("memory"),
  debug: z.boolean().default(false),
  description: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

export function QualificationForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jobName: "",
      sparkEventLogPath: "",
      outputFormat: "html",
      generateVisualization: true,
      filterString: "",
      sparkVersion: "3.3.2",
      storageLevel: "memory",
      debug: false,
      description: ""
    }
  });

  function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      console.log("Form submitted:", data);
      toast({
        title: "Job submitted successfully",
        description: `Qualification job "${data.jobName}" has been queued.`
      });
      setIsSubmitting(false);
      // We would typically navigate to job status page here
    }, 1500);
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Qualification Tool Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="jobName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Qualification Job" {...field} />
                    </FormControl>
                    <FormDescription>
                      A unique name for this qualification run.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sparkVersion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Spark Version</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Spark version" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="3.3.2">Spark 3.3.2</SelectItem>
                        <SelectItem value="3.2.3">Spark 3.2.3</SelectItem>
                        <SelectItem value="3.1.3">Spark 3.1.3</SelectItem>
                        <SelectItem value="3.0.3">Spark 3.0.3</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Spark version used for analysis.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sparkEventLogPath"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Spark Event Log Path</FormLabel>
                    <FormControl>
                      <Input placeholder="/path/to/event/log" {...field} />
                    </FormControl>
                    <FormDescription>
                      Path to Spark event logs directory or file.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="outputFormat"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Output Format</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-wrap gap-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="csv" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">CSV</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="json" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">JSON</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="excel" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">Excel</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="html" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">HTML</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="storageLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Storage Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select storage level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="memory">Memory</SelectItem>
                        <SelectItem value="disk">Disk</SelectItem>
                        <SelectItem value="diskAndMemory">Disk and Memory</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Storage level for intermediate data.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="filterString"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Filter String (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., package1.class1" {...field} />
                    </FormControl>
                    <FormDescription>
                      Analyze only events that contain this string.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="col-span-2 space-y-4">
                <FormField
                  control={form.control}
                  name="generateVisualization"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Generate Visualization</FormLabel>
                        <FormDescription>
                          Generate detailed visualizations for analysis.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="debug"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Debug Mode</FormLabel>
                        <FormDescription>
                          Enable verbose debug output during processing.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Job Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Provide additional details about this job..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Button type="button" variant="outline">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Run Qualification Tool"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
