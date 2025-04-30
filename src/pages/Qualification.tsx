
import { QualificationForm } from '@/components/qualification/QualificationForm';
import { Header } from '@/components/layout/Header';

export default function Qualification() {
  return (
    <>
      <Header 
        title="Qualification Tool" 
        description="Analyze Spark workloads to determine GPU acceleration potential"
      />
      
      <div className="space-y-6">
        <p className="text-muted-foreground">
          The RAPIDS Accelerator for Apache Spark Qualification Tool analyzes Spark event logs to 
          determine which parts of your workloads can benefit from GPU acceleration.
        </p>
        
        <QualificationForm />
      </div>
    </>
  );
}
