
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
import { BarChart2, Loader2 } from 'lucide-react';

type FormValues = {
  eventLogPath: string;
  outputFormat: 'csv' | 'json' | 'html';
  applicationName?: string;
  generateTimeline: boolean;
  additionalOptions?: string;
};

export function ProfilingForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      outputFormat: 'html',
      generateTimeline: true,
    }
  });
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

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
          title: "Profiling Complete",
          description: "Analysis successfully completed",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Analysis Failed",
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
            <Input
              id="eventLogPath"
              placeholder="local/path/to/event_log or s3://bucket/event_log"
              {...register("eventLogPath", { required: true })}
            />
            {errors.eventLogPath && (
              <p className="text-red-500 text-sm mt-1">Event log path is required</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="outputFormat">Output Format</Label>
            <Select defaultValue="html">
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
            <Checkbox id="generateTimeline" defaultChecked={true} />
            <Label htmlFor="generateTimeline">Generate Timeline Visualization</Label>
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
              <BarChart2 className="mr-2 h-4 w-4" />
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
              <p className="text-2xl font-bold">{results.executionTime} sec</p>
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
            <h4 className="font-medium">Performance Recommendations</h4>
            <ul className="list-disc pl-5 space-y-1">
              {results.recommendations.map((rec: string, index: number) => (
                <li key={index} className="text-sm">{rec}</li>
              ))}
            </ul>
          </div>
        </Card>
      )}
    </div>
  );
}
