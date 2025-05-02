
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardHeader } from '@/components/layout/Header';
import { StatCard } from '@/components/dashboard/StatCard';
import { ToolCard } from '@/components/dashboard/ToolCard';
import { JobCard, Job } from '@/components/jobs/JobCard';
import { FileSearch, BarChart2, Clock, CheckCircle, Gauge, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  total_jobs: number;
  successful_jobs: number;
  job_trend: {
    value: number;
    positive: boolean;
  };
  avg_speedup: number;
  cost_savings: number;
}

// Mock data for development/fallback
const mockJobs: Job[] = [
  {
    id: '1',
    name: 'Sample Job 1',
    type: 'qualification',
    status: 'completed',
    progress: 100,
    startTime: new Date(Date.now() - 86400000), // 1 day ago
    endTime: new Date(),
    user: 'admin'
  },
  {
    id: '2',
    name: 'Sample Job 2',
    type: 'profiling',
    status: 'running',
    progress: 65,
    startTime: new Date(),
    user: 'admin'
  },
  {
    id: '3',
    name: 'Sample Job 3',
    type: 'qualification',
    status: 'failed',
    startTime: new Date(Date.now() - 172800000), // 2 days ago
    endTime: new Date(Date.now() - 169200000), // 1 day and 23 hours ago
    user: 'admin'
  }
];

const fetchDashboardStats = async (): Promise<DashboardStats> => {
  try {
    console.log('Fetching dashboard stats...');
    const response = await axios.get('/api/stats/dashboard');
    console.log('Dashboard stats API response:', response);
    
    // Ensure we have a valid response with data
    if (response.data && typeof response.data === 'object') {
      console.log('Valid dashboard stats received:', response.data);
      return response.data;
    } else {
      console.error('Invalid dashboard stats response:', response.data);
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    // Return default data when API fails
    return {
      total_jobs: 3,
      successful_jobs: 1,
      job_trend: {
        value: 5,
        positive: true
      },
      avg_speedup: 2.5,
      cost_savings: 30
    };
  }
};

const fetchRecentJobs = async (): Promise<Job[]> => {
  try {
    console.log('Fetching recent jobs...');
    const response = await axios.get('/api/jobs');
    console.log('Recent jobs API response:', response);
    
    // Ensure the response is an array
    if (response.data && Array.isArray(response.data)) {
      console.log('Valid jobs array received with length:', response.data.length);
      
      // Process each job to ensure dates are properly converted to Date objects
      return response.data.slice(0, 3).map((job: any) => ({
        ...job,
        id: job.id?.toString() || String(Math.random()),
        startTime: job.startTime ? new Date(job.startTime) : 
                  job.start_time ? new Date(job.start_time) : new Date(),
        endTime: job.endTime ? new Date(job.endTime) : 
                job.end_time ? new Date(job.end_time) : undefined,
        user: job.user || job.user_id || 'admin'
      }));
    } else {
      console.error('API response is not an array:', response.data);
      return mockJobs; // Return mock data if API does not return an array
    }
  } catch (error) {
    console.error('Error fetching recent jobs:', error);
    return mockJobs; // Return mock data on error
  }
};

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { 
    data: stats,
    isLoading: statsLoading, 
    error: statsError,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: fetchDashboardStats
  });

  const { 
    data: recentJobs = [],
    isLoading: jobsLoading, 
    error: jobsError,
    refetch: refetchJobs
  } = useQuery({
    queryKey: ['recentJobs'],
    queryFn: fetchRecentJobs
  });

  const handleRefresh = async () => {
    console.log("Refreshing dashboard data...");
    setIsRefreshing(true);
    
    try {
      const results = await Promise.all([
        refetchStats(),
        refetchJobs()
      ]);
      
      console.log("Refresh results:", results);
      
      toast({
        title: "Dashboard Refreshed",
        description: "Latest data has been loaded",
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Refresh Failed",
        description: "Could not refresh dashboard data",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleViewJob = (job: Job) => {
    console.log("Viewing job details:", job);
    // Navigate to job details page
    navigate(`/jobs/${job.id}`);
  };

  const handleDownloadJob = async (job: Job) => {
    console.log("Attempting to download job:", job.id);
    
    if (job.status !== 'completed') {
      toast({
        title: "Cannot Download",
        description: "Only completed jobs can be downloaded",
        variant: "destructive",
      });
      return;
    }
    
    try {
      console.log(`Sending download request to /api/jobs/${job.id}/download`);
      
      // In a real implementation, this would hit an API endpoint to get a download URL
      const response = await axios.get(`/api/jobs/${job.id}/download`, {
        responseType: 'blob'
      });
      
      console.log("Download response received:", response);
      
      // Create a blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `job-${job.id}-results.zip`);
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
    }
  };

  // Ensure stats has default values if undefined
  const safeStats = stats || {
    total_jobs: 0,
    successful_jobs: 0,
    job_trend: { value: 0, positive: true },
    avg_speedup: 0,
    cost_savings: 0
  };
  
  // Make sure recentJobs is always an array
  const safeJobs = Array.isArray(recentJobs) ? recentJobs : mockJobs;
  
  console.log("Current recentJobs value:", safeJobs);
  console.log("Current stats value:", safeStats);

  return (
    <>
      <DashboardHeader 
        title="RAPIDS Dashboard" 
        description="Monitor and run NVIDIA RAPIDS tools for Spark acceleration"
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard 
          title="Total Jobs" 
          value={statsLoading ? "Loading..." : statsError ? "Error" : safeStats.total_jobs.toString()} 
          icon={<Clock className="h-5 w-5" />}
          trend={safeStats.job_trend}
        />
        <StatCard 
          title="Successful Jobs" 
          value={statsLoading ? "Loading..." : statsError ? "Error" : safeStats.successful_jobs.toString()}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <StatCard 
          title="Average Speedup" 
          value={statsLoading ? "Loading..." : statsError ? "Error" : `${safeStats.avg_speedup}x`}
          description="After GPU acceleration"
          icon={<Gauge className="h-5 w-5" />}
        />
        <StatCard 
          title="Cost Savings" 
          value={statsLoading ? "Loading..." : statsError ? "Error" : `${safeStats.cost_savings}%`}
          description="Estimated resource savings"
          icon={<Percent className="h-5 w-5" />}
        />
      </div>
      
      <h2 className="text-2xl font-bold mb-6">Available Tools</h2>
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <ToolCard
          title="Qualification Tool"
          description="Analyze your Spark workloads to determine GPU acceleration potential"
          icon={<FileSearch className="h-5 w-5" />}
          path="/qualification"
          stats={[
            { label: "Average Speedup", value: statsLoading ? "..." : `${safeStats.avg_speedup}x` },
            { label: "Analyzed Jobs", value: statsLoading ? "..." : `${safeStats.total_jobs}` }
          ]}
        />
        <ToolCard
          title="Profiling Tool"
          description="Profile GPU-accelerated Spark applications to optimize performance"
          icon={<BarChart2 className="h-5 w-5" />}
          path="/profiling"
          stats={[
            { label: "Runs", value: statsLoading ? "..." : `${safeStats.successful_jobs}` },
            { label: "Success Rate", value: statsLoading || !safeStats.total_jobs ? "..." : 
              `${Math.round((safeStats.successful_jobs / safeStats.total_jobs) * 100) || 0}%` }
          ]}
        />
      </div>
      
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Recent Jobs</h2>
        <Button variant="outline" size="sm" onClick={() => navigate('/history')}>
          View All
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {jobsLoading ? (
          <p>Loading jobs...</p>
        ) : jobsError ? (
          <p>Error loading jobs</p>
        ) : safeJobs.length > 0 ? (
          safeJobs.map((job) => (
            <JobCard 
              key={job.id} 
              job={job} 
              onView={handleViewJob}
              onDownload={handleDownloadJob}
            />
          ))
        ) : (
          <p>No jobs found</p>
        )}
      </div>
    </>
  );
}
