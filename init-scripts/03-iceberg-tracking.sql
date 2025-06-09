
-- Create tables to track Iceberg namespaces and tables for BI dashboard integration

-- Iceberg namespaces tracking
CREATE TABLE IF NOT EXISTS spark_rapids.public.iceberg_namespaces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    properties JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Iceberg tables tracking  
CREATE TABLE IF NOT EXISTS spark_rapids.public.iceberg_tables (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    namespace VARCHAR(255) NOT NULL,
    location TEXT,
    schema_info JSONB DEFAULT '{}',
    current_snapshot_id VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(name, namespace)
);

-- Add foreign key relationship
ALTER TABLE spark_rapids.public.iceberg_tables 
ADD CONSTRAINT fk_iceberg_namespace 
FOREIGN KEY (namespace) REFERENCES spark_rapids.public.iceberg_namespaces(name) 
ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_iceberg_namespaces_name ON spark_rapids.public.iceberg_namespaces(name);
CREATE INDEX IF NOT EXISTS idx_iceberg_tables_namespace ON spark_rapids.public.iceberg_tables(namespace);
CREATE INDEX IF NOT EXISTS idx_iceberg_tables_name_namespace ON spark_rapids.public.iceberg_tables(name, namespace);
