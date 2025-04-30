
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardHeader } from '@/components/layout/Header';
import { StatCard } from '@/components/dashboard/StatCard';
import { ToolCard } from '@/components/dashboard/ToolCard';
import { JobCard, Job } from '@/components/jobs/JobCard';
import { FileSearch, BarChart2, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const navigate = useNavigate();
  
  // Mock data
  const [recentJobs] = useState<Job[]>([
    {
      id: '1',
      name: 'Daily ETL Pipeline',
      type: 'qualification',
      status: 'completed',
      startTime: new Date(2024, 3, 25, 9, 30),
      endTime: new Date(2024, 3, 25, 10, 15),
      user: 'data-engineer'
    },
    {
      id: '2',
      name: 'ML Model Training',
      type: 'profiling',
      status: 'running',
      progress: 67,
      startTime: new Date(2024, 3, 29, 14, 0),
      user: 'data-scientist'
    },
    {
      id: '3',
      name: 'Weekly Analytics',
      type: 'qualification',
      status: 'warning',
      startTime: new Date(2024, 3, 28, 8, 0),
      endTime: new Date(2024, 3, 28, 9, 35),
      user: 'analyst'
    }
  ]);

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
          value="24" 
          icon={<Clock className="h-5 w-5" />}
          trend={{ value: 15, positive: true }}
        />
        <StatCard 
          title="Successful Jobs" 
          value="19" 
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <StatCard 
          title="Average Speedup" 
          value="2.7x" 
          description="After GPU acceleration"
          trend={{ value: 12, positive: true }}
        />
        <StatCard 
          title="Cost Savings" 
          value="42%" 
          description="Estimated resource savings"
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
            { label: "Average Speedup", value: "2.5x" },
            { label: "Analyzed Jobs", value: "14" }
          ]}
        />
        <ToolCard
          title="Profiling Tool"
          description="Profile GPU-accelerated Spark applications to optimize performance"
          icon={<BarChart2 className="h-5 w-5" />}
          path="/profiling"
          stats={[
            { label: "Runs", value: "10" },
            { label: "Last Run", value: "2h ago" }
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
        {recentJobs.map((job) => (
          <JobCard key={job.id} job={job} onView={handleViewJob} />
        ))}
      </div>
    </>
  );
}
