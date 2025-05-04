
-- BI Tool Schema

-- Data Sources table
CREATE TABLE data_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- postgresql, mysql, sqlite, csv, api
    connection_string TEXT,
    config JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(50) NOT NULL DEFAULT 'admin',
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Datasets table (data models)
CREATE TABLE datasets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    source_id INTEGER REFERENCES data_sources(id),
    query_type VARCHAR(50) NOT NULL, -- table, view, custom
    query_value TEXT, -- table name, view name, or SQL query
    schema JSONB, -- field definitions, types, etc.
    dimensions JSONB, -- dimension definitions
    metrics JSONB, -- metric definitions
    filters JSONB, -- default filters
    cache_policy JSONB, -- caching options
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(50) NOT NULL DEFAULT 'admin',
    last_refreshed_at TIMESTAMP
);

-- Charts table
CREATE TABLE charts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    dataset_id INTEGER REFERENCES datasets(id),
    chart_type VARCHAR(50) NOT NULL, -- bar, line, pie, table, kpi
    config JSONB, -- chart configuration
    dimensions JSONB, -- dimensions for this chart
    metrics JSONB, -- metrics for this chart
    filters JSONB, -- filters for this chart
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(50) NOT NULL DEFAULT 'admin'
);

-- Dashboards table
CREATE TABLE dashboards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    layout JSONB, -- layout configuration
    global_filters JSONB, -- dashboard-level filters
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(50) NOT NULL DEFAULT 'admin',
    is_public BOOLEAN NOT NULL DEFAULT FALSE
);

-- Dashboard items (charts placed on dashboards)
CREATE TABLE dashboard_items (
    id SERIAL PRIMARY KEY,
    dashboard_id INTEGER REFERENCES dashboards(id) ON DELETE CASCADE,
    chart_id INTEGER REFERENCES charts(id) ON DELETE CASCADE,
    position_x INTEGER NOT NULL,
    position_y INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    config JSONB -- item-specific config overrides
);

-- Sample data for data sources
INSERT INTO data_sources (name, type, connection_string, config, created_by)
VALUES 
    ('Sample PostgreSQL', 'postgresql', 'postgresql://postgres:postgres@postgres:5432/spark_rapids', '{"schema": "public"}', 'admin'),
    ('Sample CSV', 'csv', NULL, '{"location": "/app/sample-data/", "files": ["sample.csv"]}', 'admin');

-- Sample dataset
INSERT INTO datasets (name, description, source_id, query_type, query_value, schema, dimensions, metrics, created_by)
VALUES 
    ('Jobs Analysis', 'Analysis of Spark job execution', 1, 'table', 'jobs', 
     '{"fields": [
        {"name": "id", "type": "integer", "description": "Job ID"},
        {"name": "name", "type": "string", "description": "Job name"},
        {"name": "type", "type": "string", "description": "Job type"},
        {"name": "status", "type": "string", "description": "Job status"},
        {"name": "start_time", "type": "timestamp", "description": "Start time"},
        {"name": "end_time", "type": "timestamp", "description": "End time"}
     ]}',
     '[
        {"name": "job_type", "field": "type", "type": "dimension"},
        {"name": "job_status", "field": "status", "type": "dimension"},
        {"name": "date", "field": "start_time", "type": "time", "granularity": "day"}
     ]',
     '[
        {"name": "job_count", "expression": "COUNT(*)", "type": "count"},
        {"name": "avg_duration", "expression": "AVG(EXTRACT(EPOCH FROM (end_time - start_time)))", "type": "duration"}
     ]',
     'admin');

-- Sample charts
INSERT INTO charts (name, description, dataset_id, chart_type, config, dimensions, metrics, filters, created_by)
VALUES 
    ('Jobs by Status', 'Distribution of jobs by status', 1, 'pie', 
     '{"showLegend": true, "colorScheme": "category10"}',
     '[{"name": "job_status"}]',
     '[{"name": "job_count"}]',
     '[]',
     'admin'),
    ('Job Duration Trend', 'Average job duration over time', 1, 'line', 
     '{"showLegend": true, "connectNulls": true}',
     '[{"name": "date", "granularity": "day"}]',
     '[{"name": "avg_duration"}]',
     '[]',
     'admin');

-- Sample dashboard
INSERT INTO dashboards (name, description, layout, global_filters, created_by)
VALUES 
    ('Jobs Overview', 'Overview of Spark jobs performance', 
     '{"type": "grid", "columns": 12}',
     '[{"name": "date_range", "type": "dateRange", "defaultValue": {"start": "{{now-7d}}", "end": "{{now}}"}}]',
     'admin');

-- Sample dashboard items
INSERT INTO dashboard_items (dashboard_id, chart_id, position_x, position_y, width, height)
VALUES 
    (1, 1, 0, 0, 6, 4),
    (1, 2, 6, 0, 6, 4);
