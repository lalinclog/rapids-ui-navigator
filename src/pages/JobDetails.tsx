import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { JobStatus } from '@/components/jobs/JobStatus';
import { ArrowLeft, DownloadCloud } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { BaseJob, JobResults, JobStatusType, OperationStat } from '@/lib/types'

interface JobStatusProps {
    status: JobStatusType;
    progress?: number;
    large?: boolean;
  }

const validateJobStatus = (status: string): JobStatusType => {
    const validStatuses: JobStatusType[] = ['pending', 'running', 'completed', 'failed'];
    return validStatuses.includes(status as JobStatusType) 
      ? status as JobStatusType 
      : 'pending'; // default value
  };

const JobDetails = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  
  const {
    data: job,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      try {
        const response = await axios.get<BaseJob>(`/api/jobs/${jobId}`);
        console.log('Job details response:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error fetching job details:', error);
        return null;
      }
    },
  });

  const handleDownload = async () => {
    if (!job || job.status !== 'completed') {
      toast({
        title: "Cannot Download",
        description: "Only completed jobs can be downloaded",
        variant: "destructive",
      });
      return;
    }
    
    setIsDownloading(true);
    
    try {
      console.log(`Sending download request to /api/jobs/${jobId}/download`);
      
      const response = await axios.get(`/api/jobs/${jobId}/download`, {
        responseType: 'blob'
      });
      
      // Create a blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `job-${jobId}-results.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast({
        title: "Download Started",
        description: "Your results file is downloading",
      });
    } catch (error) {
      console.error('Error downloading job results:', error);
      toast({
        title: "Download Failed",
        description: "Could not download job results",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const renderResultDetails = () => {
    if (!job?.results) return <p className="text-muted-foreground">No detailed results available.</p>;
    
    try {
        const results: JobResults = typeof job.results === 'string'  ? JSON.parse(job.results) : job.results;
      
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.speedupFactor && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">Speedup Factor</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{results.speedupFactor}x</p>
                </CardContent>
              </Card>
            )}
            
            {results.resourceSavings && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">Resource Savings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{results.resourceSavings}%</p>
                </CardContent>
              </Card>
            )}
          </div>
          
          {results.recommendations && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-2">
                  {Array.isArray(results.recommendations) ? (
                    results.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))
                  ) : (
                    <li>{String(results.recommendations)}</li>
                  )}
                </ul>
              </CardContent>
            </Card>
          )}
          
          {results.operationStats && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Operation Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Operation</th>
                        <th className="text-right p-2">CPU Time (ms)</th>
                        <th className="text-right p-2">GPU Time (ms)</th>
                        <th className="text-right p-2">Speedup</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(results.operationStats).map(([key, value], index) => {
                        const stat = value as OperationStat;
                        return (
                          <tr key={index} className="border-b">
                            <td className="p-2">{key}</td>
                            <td className="text-right p-2">{stat.cpuTime || 'N/A'}</td>
                            <td className="text-right p-2">{stat.gpuTime || 'N/A'}</td>
                            <td className="text-right p-2">{stat.speedup || 'N/A'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Show raw JSON data if no structured format was detected */}
          {!results.speedupFactor && !results.recommendations && !results.operationStats && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Raw Results Data</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded overflow-auto max-h-[400px]">
                  {JSON.stringify(results, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      );
    } catch (error) {
      console.error('Error rendering results:', error);
      return (
        <Card className="mt-4">
          <CardContent>
            <p className="text-destructive">Error parsing results data</p>
          </CardContent>
        </Card>
      );
    }
  };

  // Back to dashboard
  const handleBack = () => {
    navigate(-1);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Loading job details...</h1>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Job Details</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">Could not load job details. The job may not exist or there was an error.</p>
            <Button variant="outline" onClick={handleBack} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Format dates safely
  const startDate = job.start_time ? new Date(job.start_time) : null;
  const endDate = job.end_time ? new Date(job.end_time) : null;
  const duration = endDate && startDate ? formatDistanceToNow(endDate, { addSuffix: false }) : "In progress";

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Job Details: {job.name}</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          {job.status === 'completed' && (
            <Button 
              variant="default"
              onClick={handleDownload} 
              disabled={isDownloading}
            >
              <DownloadCloud className="h-4 w-4 mr-2" />
              {isDownloading ? 'Downloading...' : 'Download Results'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-md">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <JobStatus status={validateJobStatus(job.status)} progress={job.progress} large />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-md">Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{duration}</p>
            {startDate && (
              <p className="text-sm text-muted-foreground mt-1">
                Started: {startDate.toLocaleString()}
              </p>
            )}
            {endDate && (
              <p className="text-sm text-muted-foreground">
                Ended: {endDate.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-md">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p>{job.type === 'qualification' ? 'Qualification Tool' : 'Profiling Tool'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">User</p>
                <p>{job.user || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Application</p>
                <p>{job.application_name || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-bold mt-8 mb-4">Results</h2>
      {job.status === 'completed' ? renderResultDetails() : (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              {job.status === 'running' || job.status === 'pending' ? 
                'Results will be available when the job completes.' : 
                'No results available for this job.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default JobDetails;
