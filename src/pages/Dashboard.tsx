
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardHeader } from '@/components/layout/Header';
import { StatCard } from '@/components/dashboard/StatCard';
import { ToolCard } from '@/components/dashboard/ToolCard';
import { JobCard, Job } from '@/components/jobs/JobCard';
import { FileSearch, BarChart2, Clock, CheckCircle, Gauge, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

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
  return response.data;
};

const fetchRecentJobs = async (): Promise<Job[]> => {
  const response = await axios.get('/api/jobs');
  return response.data.slice(0, 3); // Just get the first 3 jobs
};

export default function Dashboard() {
  const navigate = useNavigate();
  
  const { 
    data: stats, 
    isLoading: statsLoading, 
    error: statsError 
  } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: fetchDashboardStats
  });

  const { 
    data: recentJobs, 
    isLoading: jobsLoading, 
    error: jobsError 
  } = useQuery({
    queryKey: ['recentJobs'],
    queryFn: fetchRecentJobs
  });

  const handleViewJob = (job: Job) => {
    console.log("View job:", job);
    // Navigate to job details page
    // navigate(`/jobs/${job.id}`);
  };

  return (
    <>
      <DashboardHeader 
        title="RAPIDS Dashboard" 
        description="Monitor and run NVIDIA RAPIDS tools for Spark acceleration"
      />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard 
          title="Total Jobs" 
          value={statsLoading ? "Loading..." : statsError ? "Error" : stats?.total_jobs.toString()} 
          icon={<Clock className="h-5 w-5" />}
          trend={stats?.job_trend}
        />
        <StatCard 
          title="Successful Jobs" 
          value={statsLoading ? "Loading..." : statsError ? "Error" : stats?.successful_jobs.toString()}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <StatCard 
          title="Average Speedup" 
          value={statsLoading ? "Loading..." : statsError ? "Error" : `${stats?.avg_speedup}x`}
          description="After GPU acceleration"
          icon={<Gauge className="h-5 w-5" />}
        />
        <StatCard 
          title="Cost Savings" 
          value={statsLoading ? "Loading..." : statsError ? "Error" : `${stats?.cost_savings}%`}
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
            { label: "Average Speedup", value: statsLoading ? "..." : `${stats?.avg_speedup}x` },
            { label: "Analyzed Jobs", value: statsLoading ? "..." : stats?.total_jobs.toString() }
          ]}
        />
        <ToolCard
          title="Profiling Tool"
          description="Profile GPU-accelerated Spark applications to optimize performance"
          icon={<BarChart2 className="h-5 w-5" />}
          path="/profiling"
          stats={[
            { label: "Runs", value: statsLoading ? "..." : stats?.successful_jobs.toString() },
            { label: "Success Rate", value: statsLoading && stats?.total_jobs > 0 ? "..." : `${Math.round((stats?.successful_jobs / stats?.total_jobs) * 100) || 0}%` }
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
            <JobCard key={job.id} job={job} onView={handleViewJob} />
          ))
        ) : (
          <p>No jobs found</p>
        )}
      </div>
    </>
  );
}
