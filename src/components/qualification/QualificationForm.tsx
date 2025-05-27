
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
import { useToast } from '@/components/ui/use-toast';
import { PythonService } from '@/services/PythonService';
import { FileSearch, Loader2, Upload } from 'lucide-react';

type FormValues = {
  eventLogPath: string;
  outputFormat: 'csv' | 'json' | 'html';
  applicationName?: string;
  platform: string;
  additionalOptions?: string;
};

export function QualificationForm() {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      outputFormat: 'html',
      eventLogPath: 's3://spark-logs/example.log',
      platform: 'onprem'
    }
  });
  const [isRunning, setIsRunning] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();
  
  const watchEventLogPath = watch('eventLogPath');

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
      
      const result = await PythonService.runQualificationTool(data);
      
      if (result.success) {
        setResults(result.data);
        toast({
          title: "Qualification Started",
          description: `Job #${result.jobId} has been started. Results will be available shortly.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Analysis Failed",
          description: "Failed to run qualification tool. Check logs for details.",
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
              Running Analysis...
            </>
          ) : (
            <>
              <FileSearch className="mr-2 h-4 w-4" />
              Run Qualification Tool
            </>
          )}
        </Button>
      </form>

      {results && (
        <Card className="mt-8 p-6">
          <h3 className="text-lg font-medium mb-4">Qualification Results</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Estimated Speedup</p>
              <p className="text-2xl font-bold text-green-600">{results.speedupFactor}x</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">GPU Acceleration Opportunities</p>
              <p className="text-2xl font-bold">{results.gpuOpportunities}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-medium">Recommended Changes</h4>
            <ul className="list-disc pl-5 space-y-1">
              {results.recommendedChanges.map((change: string, index: number) => (
                <li key={index} className="text-sm">{change}</li>
              ))}
            </ul>
          </div>
        </Card>
      )}
    </div>
  );
}
