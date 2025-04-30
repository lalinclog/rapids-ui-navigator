
import { useState } from 'react';
import { DashboardHeader } from '@/components/layout/Header';
import { JobCard, Job } from '@/components/jobs/JobCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function JobHistory() {
  // Mock data
  const [jobs] = useState<Job[]>([
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
    },
    {
      id: '4',
      name: 'Customer Segmentation',
      type: 'qualification',
      status: 'completed',
      startTime: new Date(2024, 3, 24, 12, 0),
      endTime: new Date(2024, 3, 24, 13, 45),
      user: 'analyst'
    },
    {
      id: '5',
      name: 'Data Lake Transformation',
      type: 'profiling',
      status: 'failed',
      startTime: new Date(2024, 3, 27, 16, 20),
      endTime: new Date(2024, 3, 27, 16, 25),
      user: 'data-engineer'
    },
    {
      id: '6',
      name: 'AI Feature Engineering',
      type: 'qualification',
      status: 'completed',
      startTime: new Date(2024, 3, 26, 11, 0),
      endTime: new Date(2024, 3, 26, 12, 30),
      user: 'data-scientist'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    const matchesType = typeFilter === 'all' || job.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleViewJob = (job: Job) => {
    console.log("View job:", job);
    // Navigate to job details page
    // navigate(`/jobs/${job.id}`);
  };

  return (
    <>
      <DashboardHeader 
        title="Job History" 
        description="View and manage your qualification and profiling jobs"
      />
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4 mb-8">
        <div className="relative md:col-span-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select 
          value={statusFilter} 
          onValueChange={setStatusFilter}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Select 
          value={typeFilter} 
          onValueChange={setTypeFilter}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="qualification">Qualification</SelectItem>
            <SelectItem value="profiling">Profiling</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredJobs.length > 0 ? (
          filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} onView={handleViewJob} />
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <h3 className="text-lg font-medium text-muted-foreground">No jobs found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Try changing your search or filter criteria
            </p>
          </div>
        )}
      </div>
    </>
  );
}
