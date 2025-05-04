
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from 'date-fns';
import { Job } from './JobCard';
import { JobStatus } from './JobStatus';
import { Button } from '@/components/ui/button';
import { Eye, DownloadCloud, ArrowUpDown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface JobsTableProps {
  jobs: Job[];
  isLoading: boolean;
  onView: (job: Job) => void;
  onDownload?: (job: Job) => void;
}

type SortField = 'name' | 'type' | 'startTime' | 'duration' | 'user' | 'status';
type SortDirection = 'asc' | 'desc';

export function JobsTable({ jobs, isLoading, onView, onDownload }: JobsTableProps) {
  const [sortField, setSortField] = useState<SortField>('startTime');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { toast } = useToast();

  if (isLoading) {
    return <div className="py-8 text-center">Loading jobs data...</div>;
  }

  if (!Array.isArray(jobs) || jobs.length === 0) {
    return <div className="py-8 text-center">No jobs found</div>;
  }

  const handleViewClick = (e: React.MouseEvent, job: Job) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      onView(job);
    } catch (error) {
      console.error('Error viewing job:', error);
      toast({
        title: "Error",
        description: "Could not view job details",
        variant: "destructive",
      });
    }
  };
  
  const handleDownloadClick = (e: React.MouseEvent, job: Job) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (onDownload) {
        onDownload(job);
      }
    } catch (error) {
      console.error('Error downloading job results:', error);
      toast({
        title: "Download Failed",
        description: "Could not download job results",
        variant: "destructive",
      });
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedJobs = [...jobs].sort((a, b) => {
    switch (sortField) {
      case 'name':
        return sortDirection === 'asc' 
          ? (a.name || '').localeCompare(b.name || '')
          : (b.name || '').localeCompare(a.name || '');
      case 'type':
        return sortDirection === 'asc' 
          ? (a.type || '').localeCompare(b.type || '')
          : (b.type || '').localeCompare(a.type || '');
      case 'user':
        return sortDirection === 'asc' 
          ? (a.user || '').localeCompare(b.user || '')
          : (b.user || '').localeCompare(a.user || '');
      case 'status':
        return sortDirection === 'asc' 
          ? (a.status || '').localeCompare(b.status || '')
          : (b.status || '').localeCompare(a.status || '');
      case 'startTime': {
        const aTime = a.startTime instanceof Date ? a.startTime : new Date(a.startTime || 0);
        const bTime = b.startTime instanceof Date ? b.startTime : new Date(b.startTime || 0);
        return sortDirection === 'asc' ? aTime.getTime() - bTime.getTime() : bTime.getTime() - aTime.getTime();
      }
      case 'duration': {
        const aEndTime = a.endTime ? (a.endTime instanceof Date ? a.endTime : new Date(a.endTime)) : null;
        const bEndTime = b.endTime ? (b.endTime instanceof Date ? b.endTime : new Date(b.endTime)) : null;
        
        const aStartTime = a.startTime instanceof Date ? a.startTime : new Date(a.startTime || 0);
        const bStartTime = b.startTime instanceof Date ? b.startTime : new Date(b.startTime || 0);
        
        const aDuration = aEndTime ? aEndTime.getTime() - aStartTime.getTime() : Infinity;
        const bDuration = bEndTime ? bEndTime.getTime() - bStartTime.getTime() : Infinity;
        
        return sortDirection === 'asc' ? aDuration - bDuration : bDuration - aDuration;
      }
      default:
        return 0;
    }
  });

  const renderSortIcon = (field: SortField) => {
    return (
      <ArrowUpDown 
        className={`h-3.5 w-3.5 ml-1 transform inline ${
          sortField === field 
            ? 'opacity-100' + (sortDirection === 'asc' ? ' rotate-0' : ' rotate-180') 
            : 'opacity-50'
        }`}
      />
    );
  };

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort('name')}
            >
              Name {renderSortIcon('name')}
            </TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort('type')}
            >
              Type {renderSortIcon('type')}
            </TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort('startTime')}
            >
              Start Time {renderSortIcon('startTime')}
            </TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort('duration')}
            >
              Duration {renderSortIcon('duration')}
            </TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort('user')}
            >
              User {renderSortIcon('user')}
            </TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort('status')}
            >
              Status {renderSortIcon('status')}
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedJobs.map((job) => {
            console.log('Rendering job row:', job);
            
            // Ensure startTime is a valid Date object
            const startTimeDate = job.startTime instanceof Date ? job.startTime : new Date(job.startTime);
            
            // Format the duration safely
            let duration = "In progress";
            try {
              if (job.endTime) {
                const endTimeDate = job.endTime instanceof Date ? job.endTime : new Date(job.endTime);
                duration = formatDistanceToNow(endTimeDate, { addSuffix: false });
              }
            } catch (error) {
              console.error('Error formatting duration:', error);
              duration = "Unknown";
            }

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

