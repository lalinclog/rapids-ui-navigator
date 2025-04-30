
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const formSchema = z.object({
  jobName: z.string().min(3, { message: "Job name must be at least 3 characters." }),
  sparkSubmitPath: z.string().min(1, { message: "Spark submit path is required." }),
  applicationJar: z.string().min(1, { message: "Application JAR path is required." }),
  mainClass: z.string().min(1, { message: "Main class is required." }),
  outputPath: z.string().min(1, { message: "Output path is required." }),
  sparkHome: z.string().optional(),
  javaHome: z.string().optional(),
  customArgs: z.string().optional(),
  sparkConf: z.string().optional(),
  enableProfiling: z.boolean().default(true),
  collectHardwareMetrics: z.boolean().default(true),
  collectMemoryMetrics: z.boolean().default(true),
  generateGpuTimeline: z.boolean().default(true),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function ProfilingForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jobName: "",
      sparkSubmitPath: "spark-submit",
      applicationJar: "",
      mainClass: "",
      outputPath: "./profiling-output",
      sparkHome: "",
      javaHome: "",
      customArgs: "",
      sparkConf: "",
      enableProfiling: true,
      collectHardwareMetrics: true,
      collectMemoryMetrics: true,
      generateGpuTimeline: true,
      description: ""
    }
  });

  function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      console.log("Form submitted:", data);
      toast({
        title: "Profiling job submitted successfully",
        description: `Profiling job "${data.jobName}" has been queued.`
      });
      setIsSubmitting(false);
      // We would typically navigate to job status page here
    }, 1500);
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Profiling Tool Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="jobName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Profiling Job" {...field} />
                  </FormControl>
                  <FormDescription>
                    A unique name for this profiling run.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="sparkSubmitPath"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Spark Submit Path</FormLabel>
                    <FormControl>
                      <Input placeholder="spark-submit" {...field} />
                    </FormControl>
                    <FormDescription>
                      Path to spark-submit script.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="outputPath"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Output Path</FormLabel>
                    <FormControl>
                      <Input placeholder="./profiling-output" {...field} />
                    </FormControl>
                    <FormDescription>
                      Directory where profiling results will be saved.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="applicationJar"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Application JAR</FormLabel>
                    <FormControl>
                      <Input placeholder="/path/to/your/application.jar" {...field} />
                    </FormControl>
                    <FormDescription>
                      Path to your Spark application JAR file.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mainClass"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Main Class</FormLabel>
                    <FormControl>
                      <Input placeholder="com.example.SparkApp" {...field} />
                    </FormControl>
                    <FormDescription>
                      Fully qualified name of your main class.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="advanced">
                <AccordionTrigger className="text-sm font-medium">Advanced Options</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 pt-4">
                    <FormField
                      control={form.control}
                      name="sparkHome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Spark Home (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="/path/to/spark" {...field} />
                          </FormControl>
                          <FormDescription>
                            Path to Spark installation directory.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="javaHome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Java Home (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="/path/to/java" {...field} />
                          </FormControl>
                          <FormDescription>
                            Path to Java installation directory.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="customArgs"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Custom Arguments (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="--arg1 value1 --arg2 value2"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Additional arguments to pass to your application.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sparkConf"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Spark Configuration (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="spark.executor.memory=4g
spark.executor.cores=2"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Spark configuration properties, one per line.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="space-y-4">
              <h3 className="text-base font-medium leading-6">Profiling Options</h3>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="enableProfiling"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Enable Profiling</FormLabel>
                        <FormDescription>
                          Collect detailed performance metrics during execution.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="collectHardwareMetrics"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Collect Hardware Metrics</FormLabel>
                        <FormDescription>
                          Track GPU utilization, temperature and power usage.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="collectMemoryMetrics"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Collect Memory Metrics</FormLabel>
                        <FormDescription>
                          Monitor memory usage across the cluster.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="generateGpuTimeline"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Generate GPU Timeline</FormLabel>
                        <FormDescription>
                          Create detailed timeline visualization of GPU activities.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
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

            <div className="flex justify-end space-x-4 pt-4">
              <Button type="button" variant="outline">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Run Profiling Tool"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
