import os
import logging
import json
from datetime import datetime
from typing import Dict, List, Optional, Any, Union

from sqlalchemy import create_engine, text
import pandas as pd

from ..services.postgres_service import PostgresService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BIService:
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

    def create_data_source(self, data: Dict[str, Any]) -> Optional[int]:
        """Create a new data source"""
        logger.info(f"Creating new data source: {data.get('name')}")
        try:
            with self.postgres_service._get_connection() as conn:
                with conn.cursor() as cursor:
                    query = """
                    INSERT INTO data_sources 
                    (name, type, connection_string, config, created_by)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                    """
                    cursor.execute(query, (
                        data.get("name"),
                        data.get("type"),
                        data.get("connection_string"),
                        json.dumps(data.get("config", {})),
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
                return result[0] if result else None
        except Exception as e:
            logger.error(f"Error fetching dataset {dataset_id}: {str(e)}", exc_info=True)
            return None

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

    def _execute_query(self, conn, query, params=None):
        """Execute a query and return the results as a list of dictionaries"""
        with conn.cursor() as cursor:
            cursor.execute(query, params or ())
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
            if data_source["type"] != "postgresql":
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
                data = [dict(zip(columns, row)) for row in result.fetchall()]
            
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
