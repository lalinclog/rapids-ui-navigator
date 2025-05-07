
export type JobStatusType = 'pending' | 'running' | 'completed' | 'failed';

export interface OperationStat {
    cpuTime?: number | string;
    gpuTime?: number | string;
    speedup?: number | string;
  }
  
export interface JobResults {
    speedupFactor?: number;
    resourceSavings?: number;
    recommendations?: string[] | string;
    operationStats?: Record<string, OperationStat>;
    [key: string]: unknown;
}

// Base interfaces
export interface BaseJob {
    id: number;
    name: string;
    type: 'qualification' | 'profiling';
    status: JobStatusType;
    progress?: number;
    user_id?: string;
    user?: string;
    event_log_path?: string;
    eventLogPath?: string;
    application_name?: string;
    output_format?: string;
    additional_options?: string;
    start_time?: string;
    end_time?: string;
    results?: JobResults | string; // Will be refined below
  }
  
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


  
export interface UploadResponse {
    success: boolean;
    url: string;
    fileName: string;
  }
  
export interface JobResponse {
    success: boolean;
    jobId: number;
  }
  
export interface HealthCheckResponse {
    status: string;
    timestamp: string;
  }
  
export interface PythonEnvResponse {
    success: boolean;
  }
  
  // API response types
export interface ApiResponse<T> {
    data?: T;
    error?: string;
  }
  
  // API function types
export interface ApiClient {
    // Health check
    checkHealth(): Promise<ApiResponse<HealthCheckResponse>>;
    
    // Dashboard
    getDashboardStats(): Promise<ApiResponse<DashboardStats>>;
    
    // Python environment
    checkPythonEnv(): Promise<ApiResponse<PythonEnvResponse>>;
    setupPythonEnv(): Promise<ApiResponse<PythonEnvResponse>>;
    
    // Jobs
    runQualification(params: {
      eventLogPath: string;
      outputFormat: string;
      applicationName?: string;
      additionalOptions?: string;
    }): Promise<ApiResponse<JobResponse>>;
    
    runProfiling(params: {
      eventLogPath: string;
      outputFormat: string;
      applicationName?: string;
      generateTimeline?: boolean;
      additionalOptions?: string;
    }): Promise<ApiResponse<JobResponse>>;
    
    getJobs(): Promise<ApiResponse<BaseJob[]>>;
    getJob(jobId: number): Promise<ApiResponse<BaseJob>>;
    downloadJobResults(jobId: number): Promise<Blob>;
    
    // File upload
    uploadFile(file: File): Promise<ApiResponse<UploadResponse>>;
  }

// Chart data interface for our application
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  theme?: {
    light: string;
    dark: string;
  };
}

// Updated ChartConfig that matches what our dashboard uses
export interface ChartConfig {
  colors?: string[];
  showTooltip?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
  title?: string;
  data?: ChartDataPoint[];
}

// Type for chart configuration in ChartContainer component
export interface ShadcnChartConfig {
  [key: string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<"light" | "dark", string> }
  );
}
