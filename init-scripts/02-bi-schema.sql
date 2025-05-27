-- Data Sources table
CREATE TABLE IF NOT EXISTS spark_rapids.public.data_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    -- postgresql, mysql, sqlite, csv, api
    description TEXT,
    connection_string TEXT,
    config JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    -- 'active', 'error', 'pending'
    last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(50) NOT NULL DEFAULT 'admin',
    is_active BOOLEAN NOT NULL DEFAULT true
);
-- Data Sources schema information
CREATE TABLE IF NOT EXISTS data_source_fields (
    id SERIAL PRIMARY KEY,
    data_source_id INTEGER REFERENCES data_sources(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    -- 'string', 'number', 'date', etc.
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS data_source_refreshes (
    id SERIAL PRIMARY KEY,
    data_source_id INTEGER REFERENCES data_sources(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    -- 'success', 'failed'
    records_fetched INTEGER,
    error_message TEXT,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP
);
-- Datasets table (for data modeling)
CREATE TABLE IF NOT EXISTS spark_rapids.public.datasets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    source_id INTEGER REFERENCES data_sources(id),
    query_definition TEXT NOT NULL,
    -- SQL query or table name
    cache_policy VARCHAR(50),
    -- none, refresh_daily, refresh_hourly, etc.
    last_refreshed TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(50) NOT NULL DEFAULT 'admin',
    is_active BOOLEAN NOT NULL DEFAULT true
);
-- Fields table (columns in datasets)
CREATE TABLE IF NOT EXISTS spark_rapids.public.fields (
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER REFERENCES datasets(id),
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    field_type VARCHAR(50) NOT NULL,
    -- dimension, metric
    data_type VARCHAR(50) NOT NULL,
    -- string, number, date, etc.
    format_pattern VARCHAR(100),
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
-- Charts table
CREATE TABLE IF NOT EXISTS spark_rapids.public.charts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    dataset_id INTEGER REFERENCES datasets(id),
    chart_type VARCHAR(50) NOT NULL, -- bar-chart, line-chart, pie-chart, table, kpi
    config JSONB NOT NULL, -- chart configuration including fields, colors, etc.
    dimensions JSONB,
    metrics JSONB,
    filters JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(50) NOT NULL DEFAULT 'admin'
);
-- Dashboards table
CREATE TABLE IF NOT EXISTS spark_rapids.public.dashboards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    layout JSONB,
    -- dashboard layout configuration
    global_filters JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(50) NOT NULL DEFAULT 'admin',
    updated_by VARCHAR(50),
    is_public BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'in_dev',
    -- e.g., 'in_dev', 'prod', 'qa', 'decommisioned'
    classification VARCHAR(50),
    -- e.g., 'PII', 'Internal'
    owner_id VARCHAR(100),
    -- Maps to Keycloak user ID or group ID
    is_favorited_by UUID [] DEFAULT '{}',
    -- Optional: for user favorites (or use separate table)
    tags TEXT [],
    -- Optional: for tag-based filtering
    last_viewed TIMESTAMP,
    -- For analytics or sorting
    access_roles TEXT [] DEFAULT '{}' -- Optional: allowed roles (from Keycloak)
);
-- Dashboard items (charts placed on dashboards)
CREATE TABLE IF NOT EXISTS spark_rapids.public.dashboard_items (
    id SERIAL PRIMARY KEY,
    dashboard_id INTEGER REFERENCES spark_rapids.public.dashboards(id) ON DELETE CASCADE,
    chart_id INTEGER REFERENCES charts(id),
    position_x INTEGER NOT NULL,
    position_y INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    config JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE spark_rapids.public.dashboard_favorites (
    user_id VARCHAR(100),
    -- Keycloak user ID
    dashboard_id INTEGER REFERENCES spark_rapids.public.dashboards(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, dashboard_id)
);
CREATE TABLE spark_rapids.public.dashboard_permissions (
    dashboard_id INTEGER REFERENCES spark_rapids.public.dashboards(id) ON DELETE CASCADE,
    subject_type VARCHAR(10),
    -- 'user' or 'role'
    subject_id VARCHAR(100),
    -- user_id or role name from Keycloak
    permission VARCHAR(20),
    -- 'view', 'edit', 'own', etc.
    PRIMARY KEY (dashboard_id, subject_type, subject_id)
);
-- Dashboard filters
CREATE TABLE IF NOT EXISTS spark_rapids.public.dashboard_filters (
    id SERIAL PRIMARY KEY,
    dashboard_id INTEGER REFERENCES spark_rapids.public.dashboards(id) ON DELETE CASCADE,
    field_id INTEGER REFERENCES fields(id),
    filter_type VARCHAR(50) NOT NULL,
    -- date_range, select, multi_select, etc.
    default_value TEXT,
    is_required BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS spark_rapids.public.access_requests (
    id serial4 NOT NULL,
    user_id varchar(255) NOT NULL,
    dashboard_id INTEGER REFERENCES spark_rapids.public.dashboards(id) ON DELETE CASCADE,
    "permission" varchar(50) NOT NULL,
    reason text NOT NULL,
    status varchar(50) DEFAULT 'pending'::character varying NOT NULL,
    review_notes TEXT,
    created_at timestamp NOT NULL,
    updated_at timestamp NULL
);
CREATE INDEX IF NOT EXISTS idx_access_requests_user_id ON spark_rapids.public.access_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON spark_rapids.public.access_requests(status);
CREATE INDEX IF NOT EXISTS idx_access_requests_dashboard_id ON spark_rapids.public.access_requests(dataset_id);
-- Insert some sample data
INSERT INTO data_sources (name, type, connection_string)
VALUES (
        'Local PostgreSQL',
        'postgresql',
        'postgresql://postgres:postgres@postgres:5432/spark_rapids'
    ),
    (
        'Sample CSV',
        'csv',
        's3://minio/sample-data/sales.csv'
    );
-- Insert a sample dataset
INSERT INTO datasets (name, description, source_id, query_definition)
VALUES (
        'Sample Jobs Analysis',
        'Analysis of job performance data',
        1,
        'SELECT * FROM jobs'
    ),
    (
        'Sales Data',
        'Monthly sales performance',
        2,
        'sales.csv'
    );
INSERT INTO public.data_sources (
    id,
    name, 
    type, 
    description, 
    connection_string, 
    config, 
    created_by
) VALUES (
    4,  -- Next available ID after your API source (2)
    'MinIO Sales Regional Data', 
    'minio', 
    'MinIO storage containing regional sales data in CSV and Parquet formats', 
    'minio:9000:minioadmin:minioadmin:false',  -- endpoint:port:access_key:secret_key:secure
    '{
        "bucket": "bi-dashboard-data",
        "base_path": "sales/regional/",
        "supported_formats": ["csv", "parquet"],
        "default_format": "parquet",
        "cache_ttl": 3600,
        "timeout": 30,
        "region": "us-east-1"
    }'::jsonb, 
    'admin_user'
);

INSERT INTO public.dashboard_items (dashboard_id,chart_id,position_x,position_y,width,height,config)
VALUES (
1, -- dashboard_id: change this to the actual dashboard you're inserting into
3, -- chart_id: reference to "Sales by Region"
0, -- position_x
0,-- position_y
600,-- width
400,
-- height
'{"theme": "default", "showLegend": true}' -- sample config (JSON)
    )
INSERT INTO public.charts (
name,
description,
dataset_id,
chart_type,
config,
dimensions,
metrics,
filters,
created_by
    )
VALUES -- Bar Chart Example
    (
'Sales by Region',
'Bar chart showing sales distribution per region.',
1,
'bar-chart',
'{"xField": "region", "yField": "sales"}',
'{"width": 600, "height": 400}',
'[{"field": "sales", "aggregation": "sum"}]',
'[]',
'admin'
    )

-- ### Sample trasactional DB to suport initial setup for datasource and charts data

-- Create the sales database (execute this first)
CREATE DATABASE sales_data;

-- Connect to the sales_data database then run:
CREATE SCHEMA sales;

-- Create regions table
CREATE TABLE sales.regions (
    region_id SERIAL PRIMARY KEY,
    region_name VARCHAR(50) NOT NULL,
    manager VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create products table
CREATE TABLE sales.products (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sales transactions table
CREATE TABLE sales.transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_date DATE NOT NULL,
    region_id INTEGER REFERENCES sales.regions(region_id),
    product_id INTEGER REFERENCES sales.products(product_id),
    quantity INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    target_amount DECIMAL(10,2),
    salesperson VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create view for dashboard
CREATE VIEW sales.region_performance AS
SELECT 
    r.region_name AS region,
    DATE_TRUNC('month', t.transaction_date) AS month,
    SUM(t.amount) AS sales,
    SUM(t.target_amount) AS target,
    SUM(t.amount) / SUM(t.target_amount) - 1 AS growth_rate
FROM sales.transactions t
JOIN sales.regions r ON t.region_id = r.region_id
GROUP BY r.region_name, DATE_TRUNC('month', t.transaction_date);

-- Create read-only user for dashboard access
CREATE ROLE analytics_reader WITH LOGIN PASSWORD 'securepassword123';
GRANT CONNECT ON DATABASE sales_data TO analytics_reader;
GRANT USAGE ON SCHEMA sales TO analytics_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA sales TO analytics_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA sales GRANT SELECT ON TABLES TO analytics_reader;


-- Insert regions
INSERT INTO sales.regions (region_name, manager) VALUES
('North America', 'John Smith'),
('Europe', 'Maria Garcia'),
('Asia Pacific', 'Wei Zhang'),
('Latin America', 'Carlos Mendez'),
('Middle East & Africa', 'Fatima Al-Farsi');

-- Insert products
INSERT INTO sales.products (product_name, category, base_price) VALUES
('Ultra HD TV', 'Electronics', 899.99),
('Wireless Headphones', 'Electronics', 199.99),
('Organic Cotton T-Shirt', 'Clothing', 29.99),
('Stainless Steel Cookware Set', 'Home & Garden', 249.99),
('Yoga Mat', 'Sports & Outdoors', 39.99),
('Bestseller Novel', 'Books & Media', 14.99);

-- Insert sales transactions (Q2 2025)
INSERT INTO sales.transactions (
    transaction_date, region_id, product_id, quantity, amount, target_amount
) VALUES
-- North America
('2025-04-01', 1, 1, 2, 1799.98, 1600.00),
('2025-04-15', 1, 3, 10, 299.90, 250.00),
('2025-05-10', 1, 5, 5, 199.95, 180.00),
-- Europe
('2025-04-05', 2, 2, 3, 599.97, 550.00),
('2025-05-20', 2, 4, 1, 249.99, 225.00),
-- Asia Pacific
('2025-06-01', 3, 1, 1, 899.99, 800.00),
('2025-06-15', 3, 6, 20, 299.80, 280.00),
-- Latin America
('2025-05-05', 4, 3, 15, 449.85, 400.00),
-- Middle East & Africa
('2025-06-10', 5, 2, 2, 399.98, 350.00);



INSERT INTO public.dataset_fields (
    dataset_id, name, display_name, field_type, data_type, format_pattern, is_visible, created_at, updated_at
) VALUES
(2, 'region_name', 'Region Name', 'dimension', 'string', NULL, true, now(), now()),
(2, 'sales', 'Sales', 'metric', 'number', NULL, true, now(), now());


INSERT INTO public.dataset_fields (
    dataset_id, name, display_name, field_type, data_type, format_pattern, is_visible, created_at, updated_at
) VALUES
(3, 'impressions', 'Impressions', 'metric', 'number', NULL, true, now(), now()),
(3, 'clicks', 'Clicks', 'metric', 'number', NULL, true, now(), now()),
(3, 'conversions', 'Conversions', 'metric', 'number', NULL, true, now(), now());