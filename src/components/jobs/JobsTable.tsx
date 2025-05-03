
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from 'date-fns';
import { Job } from './JobCard';
import { JobStatus } from './JobStatus';
import { Button } from '@/components/ui/button';
import { Eye, DownloadCloud } from 'lucide-react';

interface JobsTableProps {
  jobs: Job[];
  isLoading: boolean;
  onView: (job: Job) => void;
  onDownload?: (job: Job) => void;
}

export function JobsTable({ jobs, isLoading, onView, onDownload }: JobsTableProps) {
  if (isLoading) {
    return <div className="py-4">Loading jobs data...</div>;
  }

  if (!Array.isArray(jobs) || jobs.length === 0) {
    return <div className="py-4">No jobs found</div>;
  }

  const handleViewClick = (e: React.MouseEvent, job: Job) => {
    e.preventDefault();
    e.stopPropagation();
    onView(job);
  };
  
  const handleDownloadClick = (e: React.MouseEvent, job: Job) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDownload) {
      onDownload(job);
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Start Time</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => {
            console.log('Rendering job row:', job);
            
            // Ensure startTime is a valid Date object
            const startTimeDate = job.startTime instanceof Date ? job.startTime : new Date(job.startTime);
            
            // Format the duration safely
            const duration = job.endTime 
              ? (job.endTime instanceof Date 
                  ? formatDistanceToNow(job.endTime, { addSuffix: false })
                  : formatDistanceToNow(new Date(job.endTime), { addSuffix: false }))
              : "In progress";

            return (
              <TableRow key={job.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell className="font-medium">{job.name}</TableCell>
                <TableCell>
                  {job.type === 'qualification' ? 'Qualification Tool' : 'Profiling Tool'}
                </TableCell>
                <TableCell>{startTimeDate.toLocaleString()}</TableCell>
                <TableCell>{duration}</TableCell>
                <TableCell>{job.user}</TableCell>
                <TableCell>
                  <JobStatus status={job.status} progress={job.progress} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs"
                      onClick={(e) => handleViewClick(e, job)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    {job.status === 'completed' && onDownload && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs"
                        onClick={(e) => handleDownloadClick(e, job)}
                      >
                        <DownloadCloud className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
