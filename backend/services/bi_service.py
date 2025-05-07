
import os
import logging
import json
from datetime import datetime
from typing import Dict, Any, List, Optional,  Union

from sqlalchemy import create_engine, text
import pandas as pd

from ..services.postgres_service import PostgresService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BIService:
    """
    Service for BI-related operations such as data sources, datasets,
    charts, dashboards, and queries.
    """
    def __init__(self):
        self.postgres_service = PostgresService()
        
    def get_data_sources(self) -> List[Dict]:
        """Get all data sources"""
        logger.info("Retrieving all data sources")
        try:
            with self.postgres_service._get_connection() as conn:
                query = """
                SELECT id, name, type, connection_string, config, 
                       created_at, updated_at, created_by, is_active
                FROM data_sources
                ORDER BY name
                """
                result = self._execute_query(conn, query)
                return result
        except Exception as e:
            logger.error(f"Error fetching data sources: {str(e)}", exc_info=True)
            return []

    def get_data_source(self, source_id: int) -> Optional[Dict]:
        """Get a specific data source by ID"""
        logger.info(f"Retrieving data source with ID: {source_id}")
        try:
            with self.postgres_service._get_connection() as conn:
                query = """
                SELECT id, name, type, connection_string, config, 
                       created_at, updated_at, created_by, is_active
                FROM data_sources
                WHERE id = %s
                """
                result = self._execute_query(conn, query, (source_id,))
                return result[0] if result else None
        except Exception as e:
            logger.error(f"Error fetching data source {source_id}: {str(e)}", exc_info=True)
            return None
    def test_data_source_connection(self, source_id: int) -> Dict[str, Any]:
        """Test connection to a data source"""
        logger.info(f"Testing connection to data source {source_id}")
        try:
            data_source = self.get_data_source(source_id)
            if not data_source:
                return {"success": False, "error": f"Data source with ID {source_id} not found"}

            # Currently only supporting PostgreSQL
            if data_source["type"].lower() in ["postgresql", "postgres"]:
                try:
                    engine = create_engine(data_source["connection_string"])
                    with engine.connect() as connection:
                        # Try a simple query to test connection
                        connection.execute(text("SELECT 1"))
                    return {"success": True, "message": "Connection successful"}
                except Exception as e:
                    logger.error(f"Connection test failed: {str(e)}", exc_info=True)
                    return {"success": False, "error": str(e)}
            else:
                return {"success": False, "error": f"Unsupported data source type: {data_source['type']}"}
        except Exception as e:
            logger.error(f"Error testing connection to data source {source_id}: {str(e)}", exc_info=True)
            return {"success": False, "error": str(e)}

    def create_data_source(self, data: Dict[str, Any]) -> Optional[int]:
        """Create a new data source"""
        logger.info(f"Creating new data source: {data.get('name')}")
        try:
            with self.postgres_service._get_connection() as conn:
                with conn.cursor() as cursor:
                    query = """
                    INSERT INTO data_sources 
                    (name, type, connection_string, config, is_active, created_by)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """
                    cursor.execute(query, (
                        data.get("name"),
                        data.get("type"),
                        data.get("connection_string"),
                        json.dumps(data.get("config", {})),
                        data.get("is_active", True),
                        data.get("created_by", "admin")
                    ))
                    source_id = cursor.fetchone()[0]
                    logger.info(f"Successfully created data source with ID: {source_id}")
                    return source_id
        except Exception as e:
            logger.error(f"Error creating data source: {str(e)}", exc_info=True)
            return None

    def update_data_source(self, source_id: int, data: Dict[str, Any]) -> bool:
        """Update an existing data source"""
        logger.info(f"Updating data source {source_id}")
        try:
            with self.postgres_service._get_connection() as conn:
                with conn.cursor() as cursor:
                    set_parts = []
                    params = []
                    
                    if "name" in data:
                        set_parts.append("name = %s")
                        params.append(data["name"])
                    
                    if "type" in data:
                        set_parts.append("type = %s")
                        params.append(data["type"])
                    
                    if "connection_string" in data:
                        set_parts.append("connection_string = %s")
                        params.append(data["connection_string"])
                    
                    if "config" in data:
                        set_parts.append("config = %s")
                        params.append(json.dumps(data["config"]))
                    
                    if "is_active" in data:
                        set_parts.append("is_active = %s")
                        params.append(data["is_active"])
                    
                    set_parts.append("updated_at = %s")
                    params.append(datetime.now())
                    
                    if not set_parts:
                        return False
                    
                    params.append(source_id)
                    query = f"UPDATE data_sources SET {', '.join(set_parts)}, updated_at = NOW() WHERE id = %s"
                    cursor.execute(query, params)
                    
                    affected = cursor.rowcount > 0
                    logger.info(f"Data source {source_id} update {'successful' if affected else 'failed'}")
                    return affected
        except Exception as e:
            logger.error(f"Error updating data source {source_id}: {str(e)}", exc_info=True)
            return False

    def delete_data_source(self, source_id: int) -> bool:
        """Delete a data source"""
        logger.info(f"Deleting data source {source_id}")
        try:
            with self.postgres_service._get_connection() as conn:
                with conn.cursor() as cursor:
                    # Check if there are any datasets using this data source
                    check_query = "SELECT COUNT(*) FROM datasets WHERE source_id = %s"
                    cursor.execute(check_query, (source_id,))
                    count = cursor.fetchone()[0]
                    
                    if count > 0:
                        logger.warning(f"Cannot delete data source {source_id}: {count} datasets are using it")
                        return False
                    
                    query = "DELETE FROM data_sources WHERE id = %s"
                    cursor.execute(query, (source_id,))
                    
                    affected = cursor.rowcount > 0
                    logger.info(f"Data source {source_id} deletion {'successful' if affected else 'failed'}")
                    return affected
        except Exception as e:
            logger.error(f"Error deleting data source {source_id}: {str(e)}", exc_info=True)
            return False
        


    def get_datasets(self) -> List[Dict]:
        """Get all datasets"""
        logger.info("Retrieving all datasets")
        try:
            with self.postgres_service._get_connection() as conn:
                query = """
                SELECT d.id, d.name, d.description, d.source_id, ds.name as source_name,
                       d.query_type, d.query_value, d.dimensions, d.metrics,
                       d.created_at, d.updated_at, d.created_by, d.last_refreshed_at
                FROM datasets d
                JOIN data_sources ds ON d.source_id = ds.id
                ORDER BY d.name
                """
                result = self._execute_query(conn, query)
                return result
        except Exception as e:
            logger.error(f"Error fetching datasets: {str(e)}", exc_info=True)
            return []

    def get_dataset(self, dataset_id: int) -> Optional[Dict]:
        """Get a specific dataset by ID"""
        logger.info(f"Retrieving dataset with ID: {dataset_id}")
        try:
            with self.postgres_service._get_connection() as conn:
                # First get the basic dataset info
                query = """
                SELECT d.id, d.name, d.description, d.source_id, ds.name as source_name,
                    d.query_type, d.query_value, d.schema, d.dimensions, d.metrics,
                    d.filters, d.cache_policy, 
                    d.created_at, d.updated_at, d.created_by, d.last_refreshed_at
                FROM datasets d
                JOIN data_sources ds ON d.source_id = ds.id
                WHERE d.id = %s
                """
                result = self._execute_query(conn, query, (dataset_id,))
                if not result:
                    return None
                
                dataset = dict(result[0])
                
                # Get column types if they exist in the database
                column_types_query = """
                SELECT column_name, column_type 
                FROM dataset_columns 
                WHERE dataset_id = %s
                ORDER BY column_order
                """
                column_types = self._execute_query(conn, column_types_query, (dataset_id,))
                
                if column_types:
                    dataset['column_types'] = {col['column_name']: col['column_type'] for col in column_types}
                
                return dataset
        except Exception as e:
            logger.error(f"Error fetching dataset {dataset_id}: {str(e)}", exc_info=True)
            return None
        
    def save_dataset_column_types(self, dataset_id: int, column_types: List[Dict[str, str]]) -> bool:
        """Save column types for a dataset"""
        logger.info(f"Saving column types for dataset {dataset_id}")
        try:
            with self.postgres_service._get_connection() as conn:
                # First delete existing column types
                delete_query = "DELETE FROM dataset_columns WHERE dataset_id = %s"
                self._execute_query(conn, delete_query, (dataset_id,), commit=True)
                
                # Insert new column types
                insert_query = """
                INSERT INTO dataset_columns (dataset_id, column_name, column_type, column_order)
                VALUES (%s, %s, %s, %s)
                """
                params = [
                    (dataset_id, col['name'], col['type'], idx)
                    for idx, col in enumerate(column_types)
                ]
                self._execute_batch_query(conn, insert_query, params, commit=True)
                
                return True
        except Exception as e:
            logger.error(f"Error saving column types for dataset {dataset_id}: {str(e)}", exc_info=True)
            return False

    def get_charts(self) -> List[Dict]:
        """Get all charts"""
        logger.info("Retrieving all charts")
        try:
            with self.postgres_service._get_connection() as conn:
                query = """
                SELECT c.id, c.name, c.description, c.dataset_id, d.name as dataset_name,
                       c.chart_type, c.config, c.dimensions, c.metrics, c.filters,
                       c.created_at, c.updated_at, c.created_by
                FROM charts c
                JOIN datasets d ON c.dataset_id = d.id
                ORDER BY c.name
                """
                result = self._execute_query(conn, query)
                return result
        except Exception as e:
            logger.error(f"Error fetching charts: {str(e)}", exc_info=True)
            return []

    def get_chart(self, chart_id: int) -> Optional[Dict]:
        """Get a specific chart by ID"""
        logger.info(f"Retrieving chart with ID: {chart_id}")
        try:
            with self.postgres_service._get_connection() as conn:
                query = """
                SELECT c.id, c.name, c.description, c.dataset_id, d.name as dataset_name,
                       c.chart_type, c.config, c.dimensions, c.metrics, c.filters,
                       c.created_at, c.updated_at, c.created_by
                FROM charts c
                JOIN datasets d ON c.dataset_id = d.id
                WHERE c.id = %s
                """
                result = self._execute_query(conn, query, (chart_id,))
                return result[0] if result else None
        except Exception as e:
            logger.error(f"Error fetching chart {chart_id}: {str(e)}", exc_info=True)
            return None

    def create_chart(self, data: Dict[str, Any]) -> Optional[int]:
        """Create a new chart"""
        logger.info(f"Creating new chart: {data.get('name')}")
        try:
            with self.postgres_service._get_connection() as conn:
                with conn.cursor() as cursor:
                    query = """
                    INSERT INTO charts 
                    (name, description, dataset_id, chart_type, config, dimensions, metrics, filters, created_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """
                    
                    # Process dimensions and metrics
                    dimensions = data.get("dimensions", [])
                    if isinstance(dimensions, str):
                        dimensions = [d.strip() for d in dimensions.split(',') if d.strip()]
                    
                    metrics = data.get("metrics", [])
                    if isinstance(metrics, str):
                        metrics = [m.strip() for m in metrics.split(',') if m.strip()]
                    
                    cursor.execute(query, (
                        data.get("name"),
                        data.get("description"),
                        data.get("dataset_id"),
                        data.get("chart_type"),
                        json.dumps(data.get("config", {})) if data.get("config") else "{}",
                        json.dumps(dimensions),
                        json.dumps(metrics),
                        json.dumps(data.get("filters", {})) if data.get("filters") else "{}",
                        data.get("created_by", "admin")
                    ))
                    chart_id = cursor.fetchone()[0]
                    logger.info(f"Successfully created chart with ID: {chart_id}")
                    return chart_id
        except Exception as e:
            logger.error(f"Error creating chart: {str(e)}", exc_info=True)
            return None

    def update_chart(self, chart_id: int, data: Dict[str, Any]) -> bool:
        """Update an existing chart"""
        logger.info(f"Updating chart {chart_id}")
        try:
            with self.postgres_service._get_connection() as conn:
                with conn.cursor() as cursor:
                    set_parts = []
                    params = []
                    
                    if "name" in data:
                        set_parts.append("name = %s")
                        params.append(data["name"])
                    
                    if "description" in data:
                        set_parts.append("description = %s")
                        params.append(data["description"])
                    
                    if "dataset_id" in data:
                        set_parts.append("dataset_id = %s")
                        params.append(data["dataset_id"])
                    
                    if "chart_type" in data:
                        set_parts.append("chart_type = %s")
                        params.append(data["chart_type"])
                    
                    if "config" in data:
                        set_parts.append("config = %s")
                        params.append(json.dumps(data["config"]))
                    
                    if "dimensions" in data:
                        dimensions = data["dimensions"]
                        if isinstance(dimensions, str):
                            dimensions = [d.strip() for d in dimensions.split(',') if d.strip()]
                        set_parts.append("dimensions = %s")
                        params.append(json.dumps(dimensions))
                    
                    if "metrics" in data:
                        metrics = data["metrics"]
                        if isinstance(metrics, str):
                            metrics = [m.strip() for m in metrics.split(',') if m.strip()]
                        set_parts.append("metrics = %s")
                        params.append(json.dumps(metrics))
                    
                    if "filters" in data:
                        set_parts.append("filters = %s")
                        params.append(json.dumps(data["filters"]))
                    
                    if not set_parts:
                        return False
                    
                    params.append(chart_id)
                    query = f"UPDATE charts SET {', '.join(set_parts)}, updated_at = NOW() WHERE id = %s"
                    cursor.execute(query, params)
                    
                    affected = cursor.rowcount > 0
                    logger.info(f"Chart {chart_id} update {'successful' if affected else 'failed'}")
                    return affected
        except Exception as e:
            logger.error(f"Error updating chart {chart_id}: {str(e)}", exc_info=True)
            return False

    def delete_chart(self, chart_id: int) -> bool:
        """Delete a chart"""
        logger.info(f"Deleting chart {chart_id}")
        try:
            with self.postgres_service._get_connection() as conn:
                with conn.cursor() as cursor:
                    # First, check if there are any dashboard items using this chart
                    check_query = "SELECT COUNT(*) FROM dashboard_items WHERE chart_id = %s"
                    cursor.execute(check_query, (chart_id,))
                    count = cursor.fetchone()[0]
                    
                    if count > 0:
                        logger.warning(f"Cannot delete chart {chart_id}: {count} dashboard items are using it")
                        return False
                    
                    # If no dependency, proceed with deletion
                    query = "DELETE FROM charts WHERE id = %s"
                    cursor.execute(query, (chart_id,))
                    
                    affected = cursor.rowcount > 0
                    logger.info(f"Chart {chart_id} deletion {'successful' if affected else 'failed'}")
                    return affected
        except Exception as e:
            logger.error(f"Error deleting chart {chart_id}: {str(e)}", exc_info=True)
            return False

    def get_dashboards(self) -> List[Dict]:
        """Get all dashboards"""
        logger.info("Retrieving all dashboards")
        try:
            with self.postgres_service._get_connection() as conn:
                query = """
                SELECT d.id, d.name, d.description, d.layout, d.global_filters,
                       d.created_at, d.updated_at, d.created_by, d.is_public,
                       COUNT(di.id) as item_count
                FROM dashboards d
                LEFT JOIN dashboard_items di ON d.id = di.dashboard_id
                GROUP BY d.id
                ORDER BY d.name
                """
                result = self._execute_query(conn, query)
                return result
        except Exception as e:
            logger.error(f"Error fetching dashboards: {str(e)}", exc_info=True)
            return []

    def get_dashboard(self, dashboard_id: int) -> Optional[Dict]:
        """Get a specific dashboard by ID with its items"""
        logger.info(f"Retrieving dashboard with ID: {dashboard_id}")
        try:
            with self.postgres_service._get_connection() as conn:
                # Get dashboard details
                query = """
                SELECT id, name, description, layout, global_filters,
                       created_at, updated_at, created_by, is_public
                FROM dashboards
                WHERE id = %s
                """
                dashboard = self._execute_query(conn, query, (dashboard_id,))
                if not dashboard:
                    return None
                
                dashboard = dashboard[0]
                
                # Get dashboard items
                items_query = """
                SELECT di.id, di.chart_id, c.name as chart_name, c.chart_type,
                       di.position_x, di.position_y, di.width, di.height, di.config
                FROM dashboard_items di
                JOIN charts c ON di.chart_id = c.id
                WHERE di.dashboard_id = %s
                ORDER BY di.position_y, di.position_x
                """
                items = self._execute_query(conn, items_query, (dashboard_id,))
                dashboard["items"] = items
                
                return dashboard
        except Exception as e:
            logger.error(f"Error fetching dashboard {dashboard_id}: {str(e)}", exc_info=True)
            return None
        
    def create_dataset(self, data: Dict[str, Any]) -> Optional[int]:
        """Create a new dataset"""
        logger.info(f"Creating new dataset: {data.get('name')}")
        try:
            with self.postgres_service._get_connection() as conn:
                with conn.cursor() as cursor:
                    query = """
                    INSERT INTO datasets 
                    (name, description, source_id, query_type, query_value, 
                     schema, dimensions, metrics, filters, cache_policy, created_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """
                    cursor.execute(query, (
                        data.get("name"),
                        data.get("description"),
                        data.get("source_id"),
                        data.get("query_type"),
                        data.get("query_value"),
                        json.dumps(data.get("schema", {})) if data.get("schema") or data.get("schema_definition", {}) else None,
                        json.dumps(data.get("dimensions", {})) if data.get("dimensions") else None,
                        json.dumps(data.get("metrics", {})) if data.get("metrics") else None,
                        json.dumps(data.get("filters", {})) if data.get("filters") else None,
                        json.dumps(data.get("cache_policy", {})) if data.get("cache_policy") else None,
                        data.get("created_by", "admin")
                    ))
                    dataset_id = cursor.fetchone()[0]
                    logger.info(f"Successfully created dataset with ID: {dataset_id}")
                    return dataset_id
        except Exception as e:
            logger.error(f"Error creating dataset: {str(e)}", exc_info=True)
            return None

    def update_dataset(self, dataset_id: int, data: Dict[str, Any]) -> bool:
        """Update an existing dataset"""
        logger.info(f"Updating dataset {dataset_id}")
        try:
            with self.postgres_service._get_connection() as conn:
                with conn.cursor() as cursor:
                    set_parts = []
                    params = []
                    
                    if "name" in data:
                        set_parts.append("name = %s")
                        params.append(data["name"])
                    
                    if "description" in data:
                        set_parts.append("description = %s")
                        params.append(data["description"])
                    
                    if "source_id" in data:
                        set_parts.append("source_id = %s")
                        params.append(data["source_id"])
                    
                    if "query_type" in data:
                        set_parts.append("query_type = %s")
                        params.append(data["query_type"])
                    
                    if "query_value" in data:
                        set_parts.append("query_value = %s")
                        params.append(data["query_value"])
                    
                    if "schema" in data:
                        set_parts.append("schema = %s")
                        params.append(json.dumps(data["schema"]))
                    
                    if "dimensions" in data:
                        set_parts.append("dimensions = %s")
                        params.append(json.dumps(data["dimensions"]))
                    
                    if "metrics" in data:
                        set_parts.append("metrics = %s")
                        params.append(json.dumps(data["metrics"]))
                    
                    if "filters" in data:
                        set_parts.append("filters = %s")
                        params.append(json.dumps(data["filters"]))
                    
                    if "cache_policy" in data:
                        set_parts.append("cache_policy = %s")
                        params.append(json.dumps(data["cache_policy"]))
                    
                    if not set_parts:
                        return False
                    
                    params.append(dataset_id)
                    query = f"UPDATE datasets SET {', '.join(set_parts)}, updated_at = NOW() WHERE id = %s"
                    cursor.execute(query, params)
                    
                    affected = cursor.rowcount > 0
                    logger.info(f"Dataset {dataset_id} update {'successful' if affected else 'failed'}")
                    return affected
        except Exception as e:
            logger.error(f"Error updating dataset {dataset_id}: {str(e)}", exc_info=True)
            return False

    def delete_dataset(self, dataset_id: int) -> bool:
        """Delete a dataset"""
        logger.info(f"Deleting dataset {dataset_id}")
        try:
            with self.postgres_service._get_connection() as conn:
                with conn.cursor() as cursor:
                    # First, check if there are any charts using this dataset
                    check_query = "SELECT COUNT(*) FROM charts WHERE dataset_id = %s"
                    cursor.execute(check_query, (dataset_id,))
                    count = cursor.fetchone()[0]
                    
                    if count > 0:
                        logger.warning(f"Cannot delete dataset {dataset_id}: {count} charts are using it")
                        return False
                    
                    # If no dependency, proceed with deletion
                    query = "DELETE FROM datasets WHERE id = %s"
                    cursor.execute(query, (dataset_id,))
                    
                    affected = cursor.rowcount > 0
                    logger.info(f"Dataset {dataset_id} deletion {'successful' if affected else 'failed'}")
                    return affected
        except Exception as e:
            logger.error(f"Error deleting dataset {dataset_id}: {str(e)}", exc_info=True)
            return False

    def _execute_query(self, conn, query, params=None):
        """Execute a query and return the results as a list of dictionaries or the cursor"""
        with conn.cursor() as cursor:
            cursor.execute(query, params or ())
            
            # For SELECT queries that return results
            if cursor.description is not None:
                columns = [desc[0] for desc in cursor.description]
                results = []
                
                for row in cursor.fetchall():
                    result_dict = dict(zip(columns, row))
                    
                    # Convert datetime objects to ISO strings
                    for key, value in result_dict.items():
                        if isinstance(value, datetime):
                            result_dict[key] = value.isoformat()
                        # Convert JSONB fields from PostgreSQL
                        elif key in ["config", "schema", "dimensions", "metrics", "filters", 
                                    "cache_policy", "layout", "global_filters"]:
                            if value and isinstance(value, str):
                                try:
                                    result_dict[key] = json.loads(value)
                                except (json.JSONDecodeError, TypeError):
                                    pass
                    
                    results.append(result_dict)
                
                return results
            # For INSERT/UPDATE/DELETE queries
            else:
                return cursor

    def execute_dataset_query(self, dataset_id: int, filters: Optional[Dict] = None) -> Dict:
        """Execute a query for a dataset and return the results"""
        logger.info(f"Executing query for dataset {dataset_id}")
        try:
            dataset = self.get_dataset(dataset_id)
            if not dataset:
                return {"success": False, "error": f"Dataset with ID {dataset_id} not found"}
            
            data_source = self.get_data_source(dataset["source_id"])
            if not data_source:
                return {"success": False, "error": f"Data source for dataset {dataset_id} not found"}
            
            # For simplicity, now only support PostgreSQL
            if data_source["type"].lower() not in ["postgresql", "postgres"]:
                return {"success": False, "error": f"Only PostgreSQL data sources are currently supported"}
            
            # Create connection
            engine = create_engine(data_source["connection_string"])
            
            # Build query based on dataset type
            if dataset["query_type"] == "table":
                base_query = f"SELECT * FROM {dataset['query_value']}"
            elif dataset["query_type"] == "view":
                base_query = f"SELECT * FROM {dataset['query_value']}"
            elif dataset["query_type"] == "custom":
                base_query = dataset["query_value"]
            else:
                return {"success": False, "error": f"Unknown query type: {dataset['query_type']}"}
            
            # Apply filters if provided
            if filters:
                # This is a simplified filter implementation
                # In a real application, you'd want to properly sanitize and validate
                where_clauses = []
                for key, value in filters.items():
                    # Simple equals filter
                    where_clauses.append(f"{key} = '{value}'")
                
                if where_clauses:
                    if "WHERE" in base_query.upper():
                        base_query += " AND " + " AND ".join(where_clauses)
                    else:
                        base_query += " WHERE " + " AND ".join(where_clauses)
            
            # Execute query
            with engine.connect() as connection:
                result = connection.execute(text(base_query))
                columns = result.keys()
                #data = [dict(zip(columns, row)) for row in result.fetchall()]
                data = [dict(row._mapping) for row in result.fetchall()]
            
            # Update last refreshed timestamp
            with self.postgres_service._get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(
                        "UPDATE datasets SET last_refreshed_at = NOW() WHERE id = %s",
                        (dataset_id,)
                    )
            
            return {
                "success": True,
                "data": data,
                "columns": columns,
                "count": len(data)
            }
        except Exception as e:
            logger.error(f"Error executing dataset query {dataset_id}: {str(e)}", exc_info=True)
            return {"success": False, "error": str(e)}
    
    def update_dashboard_items(self, dashboard_id: int, items: List[Dict]) -> bool:
        """Update dashboard items (position, size, etc.)"""
        logger.info(f"Updating items for dashboard {dashboard_id}")
        try:
            with self.postgres_service._get_connection() as conn:
                with conn.cursor() as cursor:
                    # First, remove all existing items for this dashboard
                    cursor.execute("DELETE FROM dashboard_items WHERE dashboard_id = %s", (dashboard_id,))
                    
                    # Then insert the new items
                    for item in items:
                        query = """
                        INSERT INTO dashboard_items 
                        (dashboard_id, chart_id, position_x, position_y, width, height, config)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """
                        cursor.execute(query, (
                            dashboard_id,
                            item.get("chart_id"),
                            item.get("position_x", 0),
                            item.get("position_y", 0),
                            item.get("width", 4),
                            item.get("height", 4),
                            json.dumps(item.get("config", {}))
                        ))
                    
                    return True
        except Exception as e:
            logger.error(f"Error updating dashboard items for dashboard {dashboard_id}: {str(e)}", exc_info=True)
            return False
    
    def create_dashboard(self, dashboard_data: dict) -> Optional[int]:
        """Create a new dashboard in the database"""
        logger.info(f"Creating dashboard: {dashboard_data.get('name')}")
        try:
            with self.postgres_service._get_connection() as conn:
                query = """
                INSERT INTO dashboards (
                    name, 
                    description, 
                    is_public, 
                    created_by, 
                    created_at, 
                    updated_at
                ) VALUES (%s, %s, %s, %s, NOW(), NOW())
                RETURNING id
                """
                params = (
                    dashboard_data['name'],
                    dashboard_data.get('description'),
                    dashboard_data.get('is_public', False),
                    dashboard_data.get('created_by', 'system')  # Or get from auth context
                )
                result = self._execute_query(conn, query, params)
                return result[0]['id'] if result else None
        except Exception as e:
            logger.error(f"Error creating dashboard: {str(e)}", exc_info=True)
            return None
    
    def delete_dashboard(self, dashboard_id: int) -> bool:
        """Delete a dashboard and all its items from the database"""
        logger.info(f"Deleting dashboard with ID: {dashboard_id} and its items")
        try:
            with self.postgres_service._get_connection() as conn:
                # First delete all items to maintain referential integrity
                delete_items_query = """
                DELETE FROM dashboard_items 
                WHERE dashboard_id = %s
                """
                self._execute_query(conn, delete_items_query, (dashboard_id,))
                
                # Then delete the dashboard
                delete_dashboard_query = """
                DELETE FROM dashboards 
                WHERE id = %s
                """
                result = self._execute_query(conn, delete_dashboard_query, (dashboard_id,))
                return result is not None and result.rowcount > 0
        except Exception as e:
            logger.error(f"Error deleting dashboard {dashboard_id}: {str(e)}", exc_info=True)
            return False
