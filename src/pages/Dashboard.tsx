
import { useState, useEffect } from 'react';
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

const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const response = await axios.get('/api/stats/dashboard');
  console.log('Dashboard stats API response:', response.data);
  return response.data;
};

const fetchRecentJobs = async (): Promise<Job[]> => {
  const response = await axios.get('/api/jobs');
  console.log('Recent jobs API response:', response.data);
  return response.data.slice(0, 3); // Just get the first 3 jobs
};

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
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
    data: recentJobs, 
    isLoading: jobsLoading, 
    error: jobsError,
    refetch: refetchJobs
  } = useQuery({
    queryKey: ['recentJobs'],
    queryFn: fetchRecentJobs
  });

  // Add useEffect for debugging purposes
  useEffect(() => {
    if (stats) {
      console.log('Stats data in component:', stats);
    }
    if (statsError) {
      console.error('Error fetching stats:', statsError);
    }
  }, [stats, statsError]);

  const handleRefresh = async () => {
    try {
      await Promise.all([refetchStats(), refetchJobs()]);
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
    }
  };

  const handleViewJob = (job: Job) => {
    console.log("View job:", job);
    // Navigate to job details page
    navigate(`/jobs/${job.id}`);
  };

  const handleDownloadJob = async (job: Job) => {
    if (job.status !== 'completed') {
      toast({
        title: "Cannot Download",
        description: "Only completed jobs can be downloaded",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // In a real implementation, this would hit an API endpoint to get a download URL
      const response = await axios.get(`/api/jobs/${job.id}/download`, {
        responseType: 'blob'
      });
      
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

  return (
    <>
      <DashboardHeader 
        title="RAPIDS Dashboard" 
        description="Monitor and run NVIDIA RAPIDS tools for Spark acceleration"
        onRefresh={handleRefresh}
      />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard 
          title="Total Jobs" 
          value={statsLoading ? "Loading..." : statsError ? "Error" : stats?.total_jobs?.toString() || "0"} 
          icon={<Clock className="h-5 w-5" />}
          trend={stats?.job_trend}
        />
        <StatCard 
          title="Successful Jobs" 
          value={statsLoading ? "Loading..." : statsError ? "Error" : stats?.successful_jobs?.toString() || "0"}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <StatCard 
          title="Average Speedup" 
          value={statsLoading ? "Loading..." : statsError ? "Error" : `${stats?.avg_speedup || 0}x`}
          description="After GPU acceleration"
          icon={<Gauge className="h-5 w-5" />}
        />
        <StatCard 
          title="Cost Savings" 
          value={statsLoading ? "Loading..." : statsError ? "Error" : `${stats?.cost_savings || 0}%`}
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
            { label: "Average Speedup", value: statsLoading ? "..." : `${stats?.avg_speedup || 0}x` },
            { label: "Analyzed Jobs", value: statsLoading ? "..." : `${stats?.total_jobs || 0}` }
          ]}
        />
        <ToolCard
          title="Profiling Tool"
          description="Profile GPU-accelerated Spark applications to optimize performance"
          icon={<BarChart2 className="h-5 w-5" />}
          path="/profiling"
          stats={[
            { label: "Runs", value: statsLoading ? "..." : `${stats?.successful_jobs || 0}` },
            { label: "Success Rate", value: statsLoading || !stats?.total_jobs ? "..." : `${Math.round((stats?.successful_jobs / stats?.total_jobs) * 100) || 0}%` }
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
        ) : recentJobs && recentJobs.length > 0 ? (
          recentJobs.map((job) => (
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
