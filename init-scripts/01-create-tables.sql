
-- Create jobs table
CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    progress INTEGER,
    start_time TIMESTAMP NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP,
    user_id VARCHAR(50) NOT NULL,
    event_log_path VARCHAR(255),
    application_name VARCHAR(255),
    output_format VARCHAR(10),
    additional_options TEXT,
    output_path VARCHAR(255),
    results JSONB
);

-- Sample data for jobs
INSERT INTO jobs (name, type, status, progress, start_time, end_time, user_id, event_log_path, application_name, output_format, output_path, results)
VALUES 
    ('Daily ETL Job', 'qualification', 'completed', 100, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '30 minutes', 'admin', 's3://spark-logs/etl-job-logs', 'ETL Pipeline', 'json', 's3://rapids-outputs/qualification-results/etl-report.json', 
    '{"speedupFactor": 3.2, "gpuOpportunities": 15, "recommendedChanges": ["Replace DataFrame.groupBy() operations with GPU acceleration", "Optimize join operations for GPU processing", "Convert string columns to dictionary encoding for better GPU performance"]}'),
    
    ('ML Training Job', 'profiling', 'completed', 100, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '45 minutes', 'admin', 's3://spark-logs/ml-job-logs', 'Machine Learning Pipeline', 'html', 's3://rapids-outputs/profiling-results/ml-report.html',
    '{"executionTime": 42.7, "gpuUtilization": 82.6, "memoryUsage": 5.8, "recommendations": ["Increase executor memory for improved performance", "Consider adjusting partition size", "Enable adaptive query execution"]}'),
    
    ('Real-time Analytics', 'qualification', 'running', 65, NOW() - INTERVAL '2 hours', NULL, 'user1', 's3://spark-logs/streaming-logs', 'Streaming Analytics', 'html', NULL, NULL),
    
    ('Customer Segmentation', 'profiling', 'failed', 48, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '4 hours', 'user2', 's3://spark-logs/segmentation-logs', 'Customer Analysis', 'csv', NULL, 
    '{"error": "Memory allocation failed during execution phase"}'
    );
