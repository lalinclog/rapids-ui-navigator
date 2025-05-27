
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { PythonService } from '@/services/PythonService';
import { LineChart, Activity, Loader2, Upload } from 'lucide-react';

type FormValues = {
  eventLogPath: string;
  outputFormat: 'csv' | 'json' | 'html';
  applicationName?: string;
  platform: string;
  generateTimeline: boolean;
  additionalOptions?: string;
};

export function ProfilingForm() {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      outputFormat: 'html',
      eventLogPath: 's3://spark-logs/example.log',
      platform: 'onprem',
      generateTimeline: true
    }
  });
  const [isRunning, setIsRunning] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();
  
  const watchEventLogPath = watch('eventLogPath');
  const watchGenerateTimeline = watch('generateTimeline');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const result = await PythonService.uploadFile(file);
      if (result.success) {
        setValue('eventLogPath', result.url);
        toast({
          title: "File Uploaded",
          description: `${file.name} has been uploaded successfully.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: "Failed to upload file. Please try again.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload Error",
        description: "An unexpected error occurred during upload",
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    setIsRunning(true);
    try {
      // Check if Python environment is ready
      const isReady = await PythonService.checkPythonEnv();
      
      if (!isReady) {
        toast({
          variant: "destructive",
          title: "Environment Not Ready",
          description: "Please set up the Python environment in Settings before running tools.",
        });
        return;
      }
      
      const result = await PythonService.runProfilingTool(data);
      
      if (result.success) {
        setResults(result.data);
        toast({
          title: "Profiling Started",
          description: `Job #${result.jobId} has been started. Results will be available shortly.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Profiling Failed",
          description: "Failed to run profiling tool. Check logs for details.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="form-container">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="eventLogPath">Spark Event Log Path</Label>
            <div className="flex mt-1">
              <Input
                id="eventLogPath"
                placeholder="s3://bucket/event_log"
                {...register("eventLogPath", { required: true })}
                className="rounded-r-none"
              />
              <div className="relative">
                <Input
                  id="fileUpload"
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button 
                  type="button"
                  variant="secondary"
                  className="h-10 rounded-l-none"
                  onClick={() => document.getElementById('fileUpload')?.click()}
                  disabled={uploadingFile}
                >
                  {uploadingFile ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Use s3://spark-logs/... for logs stored in MinIO or upload your own file
              </p>
              {errors.eventLogPath && (
                <p className="text-red-500 text-sm mt-1">Event log path is required</p>
              )}
              </div>

              <div>
                  <Label htmlFor="platform">Platform</Label>
                  <Select 
                    defaultValue="onprem"
                    onValueChange={(value) => setValue('platform', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="onprem">On-Premises</SelectItem>
                      <SelectItem value="emr">AWS EMR</SelectItem>
                      <SelectItem value="dataproc">Google Dataproc</SelectItem>
                      <SelectItem value="dataproc-gke">Dataproc GKE</SelectItem>
                      <SelectItem value="databricks-aws">Databricks on AWS</SelectItem>
                      <SelectItem value="databricks-azure">Databricks on Azure</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select the platform where your Spark application was executed
                  </p>
                </div>
          
                <div>
                  <Label htmlFor="outputFormat">Output Format</Label>
                  <Select 
                    defaultValue="html"
                    onValueChange={(value) => setValue('outputFormat', value as 'html' | 'csv' | 'json')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select output format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="html">HTML</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
          
                <div>
                  <Label htmlFor="applicationName">Application Name (Optional)</Label>
                  <Input
                    id="applicationName"
                    placeholder="My Spark Application"
                    {...register("applicationName")}
                  />
                </div>
          
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="generateTimeline"
                    checked={watchGenerateTimeline}
                    onCheckedChange={(checked) => {
                      setValue('generateTimeline', checked === true);
                    }} 
                  />
                  <Label 
                    htmlFor="generateTimeline"
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    Generate Timeline
                  </Label>
                </div>
          
          <div>
            <Label htmlFor="additionalOptions">Additional Options (Optional)</Label>
            <Textarea
              id="additionalOptions"
              placeholder="--option1 value1 --option2 value2"
              {...register("additionalOptions")}
              className="h-20"
            />
          </div>
        </div>
        
        <Button type="submit" disabled={isRunning} className="w-full">
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Profiling...
            </>
          ) : (
            <>
              <Activity className="mr-2 h-4 w-4" />
              Run Profiling Tool
            </>
          )}
        </Button>
      </form>

      {results && (
        <Card className="mt-8 p-6">
          <h3 className="text-lg font-medium mb-4">Profiling Results</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Execution Time</p>
              <p className="text-2xl font-bold">{results.executionTime}s</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">GPU Utilization</p>
              <p className="text-2xl font-bold">{results.gpuUtilization}%</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Memory Usage</p>
              <p className="text-2xl font-bold">{results.memoryUsage} GB</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-medium">Recommendations</h4>
            <ul className="list-disc pl-5 space-y-1">
              {results.recommendations.map((recommendation: string, index: number) => (
                <li key={index} className="text-sm">{recommendation}</li>
              ))}
            </ul>
          </div>

          {results.timelineData && (
             <div className="mt-6 pt-6 border-t">
               <div className="flex items-center justify-between mb-4">
                 <h4 className="font-medium">Execution Timeline</h4>
                 <LineChart className="h-5 w-5 text-muted-foreground" />
               </div>
               <div className="h-24 bg-muted/30 rounded-md flex items-center justify-center">
                 <p className="text-sm text-muted-foreground">Timeline visualization available in detailed view</p>
               </div>
             </div>
           )}
        </Card>
      )}
    </div>
  );
}