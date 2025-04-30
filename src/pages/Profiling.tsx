
import { ProfilingForm } from '@/components/profiling/ProfilingForm';
import { Header } from '@/components/layout/Header';

export default function Profiling() {
  return (
    <>
      <Header 
        title="Profiling Tool" 
        description="Profile GPU-accelerated Spark applications for performance optimization"
      />
      
      <div className="space-y-6">
        <p className="text-muted-foreground">
          The RAPIDS Accelerator for Apache Spark Profiling Tool helps you understand the 
          performance characteristics of your GPU-accelerated Spark applications.
        </p>
        
        <ProfilingForm />
      </div>
    </>
  );
}
