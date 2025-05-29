
import os
import logging
from io import BytesIO
import json
import csv
from datetime import datetime
from typing import Dict, Any, List, Optional,  Union
from psycopg2.extras import Json
import traceback
import re
from sqlalchemy import create_engine, text
import pandas as pd
from dateutil import parser
import requests

from ..services.postgres_service import PostgresService
from ..services.data_source_service import DataSourceService
from ..services.minio_service import MinioService

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
        self.minio_service = MinioService()

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
            logger.error(
                f"Error fetching data sources: {str(e)}", exc_info=True)
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
                logger.info(f"Retrieved data source data: {result}")
                return result[0] if result else None
        except Exception as e:
            logger.error(
                f"Error fetching data source {source_id}: {str(e)}", exc_info=True)
            return None

    def test_data_source_connection(self, source_id: int) -> Dict[str, Any]:
        """Test connection to a data source"""
        logger.info(f"Testing connection to data source {source_id}")
        try:
            data_source = self.get_data_source(source_id)
            if not data_source:
                return {"success": False, "error": f"Data source with ID {source_id} not found"}
            
            ds_type = data_source["type"].lower()

            # Currently only supporting PostgreSQL
            if ds_type in ["postgresql", "postgres"]:
                try:
                    engine = create_engine(data_source["connection_string"])
                    with engine.connect() as connection:
                        # Try a simple query to test connection
                        connection.execute(text("SELECT 1"))
                    return {"success": True, "message": "Connection successful"}
                except Exception as e:
                    logger.error(
                        f"Connection test failed: {str(e)}", exc_info=True)
                    return {"success": False, "error": str(e)}
            elif ds_type in ["csv", "minio"]:
                # Parse MinIO connection string (format: endpoint:port:access_key:secret_key:secure
                # Try listing objects to test connectivity
                try:
                    config = data_source.get("config", {})
                    bucket = config.get('bucket')
                    prefix = config.get("base_path", "")
                    objects = self.minio_service.list_objects(bucket_name=bucket, prefix=prefix)
                    # You can log or return a success message here
                    return {
                        "success": True, 
                        "message": f"Connection successful, found {len(objects)} object(s)."
                        }
                except Exception as e:
                    logger.error(f"MinIO CSV connection test failed: {str(e)}", exc_info=True)
                    return {"success": False, "error": str(e)}
                else:
                    return {"success": False, "error": f"Unsupported data source type: {data_source['type']}"}
        except Exception as e:
            logger.error(
                f"Error testing connection to data source {source_id}: {str(e)}", exc_info=True)
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
                    logger.info(
                        f"Successfully created data source with ID: {source_id}")
                    return source_id
        except Exception as e:
            logger.error(
                f"Error creating data source: {str(e)}", exc_info=True)
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

                    if not set_parts:
                        return False

                    params.append(source_id)
                    query = f"UPDATE data_sources SET {', '.join(set_parts)}, updated_at = NOW() WHERE id = %s"
                    cursor.execute(query, params)

                    affected = cursor.rowcount > 0
                    logger.info(
                        f"Data source {source_id} update {'successful' if affected else 'failed'}")
                    return affected
        except Exception as e:
            logger.error(
                f"Error updating data source {source_id}: {str(e)}", exc_info=True)
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
                        logger.warning(
                            f"Cannot delete data source {source_id}: {count} datasets are using it")
                        return False

                    query = "DELETE FROM data_sources WHERE id = %s"
                    cursor.execute(query, (source_id,))

                    affected = cursor.rowcount > 0
                    logger.info(
                        f"Data source {source_id} deletion {'successful' if affected else 'failed'}")
                    return affected
        except Exception as e:
            logger.error(
                f"Error deleting data source {source_id}: {str(e)}", exc_info=True)
            return False

    def get_minio_datasets(self, names: List[str]) -> Dict[str, Dict]:
        """
        Return formatted MinIO datasets that match the provided names.
        Output is a dict keyed by dataset name.
        """
        all_minio_datasets = self.minio_service.list_minio_datasets()
        name_set = set(names)
        filtered = {}

        for ds in all_minio_datasets:
            if ds["name"] in name_set:
                formatted_ds = {
                    "id": f"minio-{ds['name']}",
                    "name": ds["name"],
                    "description": ds.get("description", "MinIO object storage dataset"),
                    "preview": ds.get("preview", []),
                    "icon": "🪣"
                }
                filtered[ds["name"]] = formatted_ds

        return filtered

    def get_datasets(self) -> List[Dict]:
        """Get all datasets with basic info and schema for the frontend list view"""
        logger.info("Retrieving all datasets")
        try:
            datasets = []

            with self.postgres_service._get_connection() as conn:
                # First, fetch all datasets with their source info
                query = """
                SELECT 
                    d.id, d.name, d.description, d.source_id, ds.name AS source_name,
                    ds.type AS source_type, ds.status AS source_status,
                    ds.config AS source_config, ds.last_updated AS source_last_updated,
                    d.query_definition AS query_value, d.cache_policy,
                    d.created_at, d.updated_at, d.created_by, d.last_refreshed, ds.connection_string
                FROM datasets d
                JOIN data_sources ds ON d.source_id = ds.id
                WHERE d.is_active = true
                ORDER BY d.name
                """
                results = self._execute_query(conn, query)

                if not results:
                    return []

                # Get all field metadata in one go for efficiency
                dataset_ids = tuple(row["id"] for row in results)
                if not dataset_ids:
                    return []

                field_query = """
                SELECT dataset_id, name, display_name, data_type, field_type, format_pattern
                FROM dataset_fields
                WHERE dataset_id IN %s
                ORDER BY dataset_id, id
                """
                fields = self._execute_query(conn, field_query, (dataset_ids,))

                # Group fields by dataset_id
                fields_by_dataset = {}
                for field in fields:
                    ds_id = field["dataset_id"]
                    fields_by_dataset.setdefault(ds_id, []).append({
                        "name": field["name"],
                        "type": field["data_type"],
                        "description": field.get("display_name") or "",
                        "fieldType": field.get("field_type", "metric"),
                        "format": field.get("format_pattern")
                    })

                # Step 3: Collect MinIO dataset names and fetch previews
                minio_dataset_names = [row["name"]
                                       for row in results if row["source_type"] == "minio"]
                minio_data_map = self.get_minio_datasets(minio_dataset_names)

                # Step 4: Build final response
                for row in results:
                    dataset_id = row["id"]
                    source_type = row["source_type"]
                    query_value = row["query_value"]
                    sample_data = []

                    try:
                        if source_type == "postgres" and query_value and query_value.strip().lower().startswith("select"):
                            preview_query = f"{query_value.strip()} LIMIT 20"
                            preview_result = self._fetch_dataset_data(
                                conn, row["source_id"], preview_query, metrics=None
                            )
                            sample_data = preview_result if isinstance(
                                preview_result, list) else []
                        elif source_type == "api":
                            try:
                                api_url = row["source_config"].get(
                                    "endpoint")  # assuming endpoint stored here
                                headers = row["source_config"].get(
                                    "headers", {})
                                if api_url:
                                    response = requests.get(
                                        api_url, headers=headers, timeout=5)
                                    response.raise_for_status()
                                    sample_data = response.json()
                                    # Optionally, trim or process sample_data to keep only a few entries
                                    if isinstance(sample_data, list):
                                        sample_data = sample_data[:20]
                                    elif isinstance(sample_data, dict):
                                        # Wrap single dict or take a key if data is nested
                                        sample_data = [sample_data]
                            except Exception as ex:
                                logger.warning(
                                    f"API preview failed for dataset {dataset_id}: {ex}")

                        elif source_type == "minio":
                            minio_ds = minio_data_map.get(row["name"])
                            if minio_ds:
                                sample_data = minio_ds["preview"]

                        elif source_type in ("file"):
                            # Example: fallback mock or empty array — replace with real preview logic if needed
                            sample_data = []
                            # or add simulated data:
                            # sample_data = [{"field1": "value1", "field2": 123}, ...]
                    except Exception as preview_error:
                        logger.warning(
                            f"Could not get sample data for dataset {dataset_id}: {preview_error}")

                    datasets.append({
                        "id": f"ds-{dataset_id}",
                        "name": row["name"],
                        "type": row["source_type"],
                        "description": row["description"],
                        "lastUpdated": parser.parse(row["source_last_updated"]).isoformat() if row["source_last_updated"] else None,
                        "status": row["source_status"],
                        "config": row["source_config"] or {},
                        "schema": {
                            "fields": fields_by_dataset.get(dataset_id, [])
                        },
                        "sampleData": sample_data
                    })

                return datasets

        except Exception as e:
            logger.error(f"Error fetching datasets: {str(e)}", exc_info=True)
            return []

    def save_dataset_fields(self, dataset_id: int, fields: List[Dict[str, str]]) -> bool:
        """Save fields for a dataset"""
        logger.info(f"Saving fields for dataset {dataset_id}")
        try:
            with self.postgres_service._get_connection() as conn:
                delete_query = "DELETE FROM dataset_fields WHERE dataset_id = %s"
                self._execute_query(conn, delete_query,
                                    (dataset_id,), commit=True)

                insert_query = """
                INSERT INTO dataset_fields
                (dataset_id, name, display_name, field_type, data_type, format_pattern, is_visible)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """
                params = [
                    (
                        dataset_id,
                        field.get('name'),
                        field.get('display_name', field.get('name')),
                        field.get('field_type', 'metric'),  # or 'dimension'
                        # maps to 'data_type'
                        field.get('type'),
                        field.get('format_pattern', None),
                        field.get('is_visible', True)
                    )
                    for field in fields
                ]
                self._execute_batch_query(
                    conn, insert_query, params, commit=True)
                return True
        except Exception as e:
            logger.error(
                f"Error saving fields for dataset {dataset_id}: {str(e)}", exc_info=True)
            return False

    def get_dataset(self, dataset_id: int) -> Optional[Dict]:
        """Get a specific dataset by ID, including schema for frontend"""
        logger.info(f"Retrieving dataset with ID: {dataset_id}")
        try:
            with self.postgres_service._get_connection() as conn:
                # Fetch dataset + source info
                query = """
                SELECT 
                    d.id, d.name, d.description, d.source_id, ds.name AS source_name,
                    ds.type AS source_type, ds.status AS source_status,
                    ds.config AS source_config, ds.last_updated AS source_last_updated,
                    d.query_definition AS query_value, d.cache_policy,
                    d.created_at, d.updated_at, d.created_by, d.last_refreshed
                FROM datasets d
                JOIN data_sources ds ON d.source_id = ds.id
                WHERE d.id = %s
                """
                result = self._execute_query(conn, query, (dataset_id,))
                if not result:
                    return None

                row = dict(result[0])

                # Build base dataset structure
                dataset = {
                    "id": f"ds-{row['id']}",
                    "name": row["name"],
                    "type": row["source_type"],
                    "description": row["description"],
                    "lastUpdated": row["source_last_updated"].isoformat() if row["source_last_updated"] else None,
                    "status": row["source_status"],
                    "config": row["source_config"] or {},
                    "query": row["query_value"],
                    "cachePolicy": row["cache_policy"],
                    "schema": {
                        "fields": []
                    }
                }

                # Fetch fields
                field_query = """
                SELECT name, display_name, data_type, field_type, format_pattern
                FROM dataset_fields
                WHERE dataset_id = %s
                ORDER BY id
                """
                fields = self._execute_query(conn, field_query, (dataset_id,))

                for field in fields:
                    dataset["schema"]["fields"].append({
                        "name": field["name"],
                        "type": field["data_type"],
                        # Use display_name if provided
                        "description": field.get("display_name") or "",
                        "fieldType": field.get("field_type", "metric"),
                        "format": field.get("format_pattern")
                    })

                return dataset
        except Exception as e:
            logger.error(
                f"Error fetching dataset {dataset_id}: {str(e)}", exc_info=True)
            return None

    def save_dataset_column_types(self, dataset_id: int, column_types: List[Dict[str, str]]) -> bool:
        """Save column types for a dataset"""
        logger.info(f"Saving column types for dataset {dataset_id}")
        try:
            with self.postgres_service._get_connection() as conn:
                # First delete existing column types
                delete_query = "DELETE FROM dataset_fields WHERE dataset_id = %s"
                self._execute_query(conn, delete_query,
                                    (dataset_id,), commit=True)

                # Insert new column types
                insert_query = """
                INSERT INTO dataset_fields (dataset_id, column_name, column_type, column_order)
                VALUES (%s, %s, %s, %s)
                """
                params = [
                    (dataset_id, col['name'], col['type'], idx)
                    for idx, col in enumerate(column_types)
                ]
                self._execute_batch_query(
                    conn, insert_query, params, commit=True)

                return True
        except Exception as e:
            logger.error(
                f"Error saving column types for dataset {dataset_id}: {str(e)}", exc_info=True)
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
            logger.error(
                f"Error fetching chart {chart_id}: {str(e)}", exc_info=True)
            return None

    def create_chart(self, data: Dict[str, Any]) -> Optional[int]:
        """Create a new chart"""
        logger.info(f"Creating new chart: {data.get('name')}")
        try:
            with self.postgres_service._get_connection() as conn:
                with conn.cursor() as cursor:
                    query = """
                    INSERT INTO charts
                    (name, description, dataset_id, chart_type,
                     config, dimensions, metrics, filters, created_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """

                    # Process dimensions and metrics
                    dimensions = data.get("dimensions", [])
                    if isinstance(dimensions, str):
                        dimensions = [d.strip()
                                      for d in dimensions.split(',') if d.strip()]

                    metrics = data.get("metrics", [])
                    if isinstance(metrics, str):
                        metrics = [m.strip()
                                   for m in metrics.split(',') if m.strip()]

                    cursor.execute(query, (
                        data.get("name"),
                        data.get("description"),
                        data.get("dataset_id"),
                        data.get("chart_type"),
                        json.dumps(data.get("config", {})) if data.get(
                            "config") else "{}",
                        json.dumps(dimensions),
                        json.dumps(metrics),
                        json.dumps(data.get("filters", {})) if data.get(
                            "filters") else "{}",
                        data.get("created_by", "admin")
                    ))
                    chart_id = cursor.fetchone()[0]
                    logger.info(
                        f"Successfully created chart with ID: {chart_id}")
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
                            dimensions = [d.strip()
                                          for d in dimensions.split(',') if d.strip()]
                        set_parts.append("dimensions = %s")
                        params.append(json.dumps(dimensions))

                    if "metrics" in data:
                        metrics = data["metrics"]
                        if isinstance(metrics, str):
                            metrics = [m.strip()
                                       for m in metrics.split(',') if m.strip()]
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
                    logger.info(
                        f"Chart {chart_id} update {'successful' if affected else 'failed'}")
                    return affected
        except Exception as e:
            logger.error(
                f"Error updating chart {chart_id}: {str(e)}", exc_info=True)
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
                        logger.warning(
                            f"Cannot delete chart {chart_id}: {count} dashboard items are using it")
                        return False

                    # If no dependency, proceed with deletion
                    query = "DELETE FROM charts WHERE id = %s"
                    cursor.execute(query, (chart_id,))

                    affected = cursor.rowcount > 0
                    logger.info(
                        f"Chart {chart_id} deletion {'successful' if affected else 'failed'}")
                    return affected
        except Exception as e:
            logger.error(
                f"Error deleting chart {chart_id}: {str(e)}", exc_info=True)
            return False

    # @staticmethod
    def has_user_access(
        raw_permissions: List[str],
        user_id: str,
        user_roles: List[str],
        owner_id: Optional[str]
    ) -> bool:
        if owner_id and user_id == owner_id:
            return True

        for perm in raw_permissions or []:
            try:
                subject_type, subject_id, permission = perm.split(":")
                if subject_type == "user" and subject_id == user_id and permission in ["view", "edit", "own"]:
                    return True
                if subject_type == "role" and subject_id in user_roles and permission in ["view", "edit", "own"]:
                    return True
            except ValueError:
                continue
        return False

    def get_dashboards(self, user_id: str, user_roles: List[str]) -> List[Dict]:
        """Get all dashboards"""
        logger.info("Retrieving all dashboards")
        try:
            with self.postgres_service._get_connection() as conn:
                query = """
                SELECT d.id, d.name, d.description, d.layout, d.global_filters,
                       d.created_at, d.updated_at, d.created_by, d.updated_by,
                       d.status, d.classification, d.tags, d.owner_id,
                       d.access_roles, d.is_public, d.is_favorited_by,
                       COUNT(di.id) as item_count,
                       ARRAY_AGG(dp.subject_type || ':' || dp.subject_id || ':' || dp.permission) AS raw_permissions,
                       CASE WHEN ar_pending IS NOT NULL THEN true ELSE false END AS has_pending_request
                FROM dashboards d
                LEFT JOIN dashboard_items di ON d.id = di.dashboard_id
                LEFT JOIN dashboard_permissions dp ON d.id = dp.dashboard_id
                LEFT JOIN LATERAL (
                    SELECT 1
                    FROM access_requests ar
                    WHERE ar.dataset_id = d.id AND ar.user_id = %s AND ar.status = 'pending'
                    LIMIT 1
                ) ar_pending ON true
                GROUP BY d.id, d.name, d.description, d.layout, d.global_filters,
                        d.created_at, d.updated_at, d.created_by, d.updated_by,
                        d.status, d.classification, d.tags, d.owner_id, d.access_roles, d.is_public,
                        d.is_favorited_by, ar_pending
                ORDER BY d.name
                """
                dashboards = self._execute_query(conn, query, (user_id,))

                for d in dashboards:
                    d["hasAccess"] = BIService.has_user_access(
                        d.get("raw_permissions"),
                        user_id,
                        user_roles,
                        d.get("owner_id")
                    )
                    # Clean before sending to frontend
                    d["is_favorited_by"] = user_id in (
                        d.get("is_favorited_by") or [])
                    d["tags"] = d.get("tags") or []
                    d["thumbnail"] = None  # Placeholder
                    d.pop("raw_permissions", None)

                return dashboards
        except Exception as e:
            logger.error(f"Error fetching dashboards: {str(e)}", exc_info=True)
            return []

    def get_dashboard(self, user_id: str, user_roles: List[str], dashboard_id: int) -> Optional[Dict]:
        """Get a specific dashboard by ID with its items"""
        logger.info(f"Retrieving dashboard with ID: {dashboard_id}")
        try:
            with self.postgres_service._get_connection() as conn:
                # Get dashboard details
                query = """
                SELECT id, name, description, layout, global_filters,
                created_at, updated_at, created_by, updated_by,
                is_public, status, classification, tags,
                owner_id, access_roles, is_favorited_by
                FROM dashboards
                WHERE id = %s
                """
                result = self._execute_query(conn, query, (dashboard_id,))
                if not result:
                    return None

                dashboard = result[0]

                # Get dashboard items
                items_query = """
                SELECT di.id, di.chart_id, c.name AS chart_name, c.chart_type,
                       di.position_x, di.position_y, di.width, di.height, di.config,
                       d.query_definition, d.source_id,
                       c.dataset_id, c.metrics, c.config AS chart_config
                FROM dashboard_items di
                JOIN charts c ON di.chart_id = c.id
                JOIN datasets d ON c.dataset_id = d.id
                WHERE di.dashboard_id = %s
                ORDER BY di.position_y, di.position_x
                """
                items = self._execute_query(conn, items_query, (dashboard_id,))

                dashboard_items = []
                for i in items:
                    # Execute the dataset query to get fresh data
                    dataset_data = self._fetch_dataset_data(
                        conn,
                        i['source_id'],
                        i['query_definition'],
                        i.get('metrics', [])
                    )

                    # Merge configurations
                    config = {
                        **(i['chart_config'] or {}),
                        **(i['config'] or {})
                    }

                    dashboard_items.append({
                        "id": str(i["id"]),
                        "type": i["chart_type"],
                        "chart_id": i["chart_id"],
                        "title": i["chart_name"],
                        "x": i["position_x"],
                        "y": i["position_y"],
                        "width": i["width"],
                        "height": i["height"],
                        "config": config,
                        "content": dataset_data,
                        "pageId": "main",
                        "zIndex": 0,
                    })

                # Transform fields to match frontend expectations
                dashboard["data"] = {
                    "items": dashboard_items,
                    "globalFilters": dashboard.get("global_filters") or {},
                    "dimensions": (dashboard.get("layout") or {}).get("dimensions", {"width": 1200, "height": 800}),
                }

                dashboard["layout"] = {
                    "dimensions": dashboard["data"]["dimensions"]
                }

                dashboard["classification"] = dashboard.get(
                    "classification") or "internal"
                dashboard["hasAccess"] = BIService.has_user_access(
                    dashboard.get("raw_permissions"),
                    user_id,
                    user_roles,
                    dashboard.get("owner_id")
                )
                dashboard["is_favorited_by"] = user_id in (
                    dashboard.get("is_favorited_by") or [])
                dashboard["tags"] = dashboard.get("tags") or []
                # Optional: populate from future field
                dashboard["thumbnail"] = None

                # Cleanup unused keys
                dashboard.pop("global_filters", None)
                return dashboard
        except Exception as e:
            logger.error(
                f"Error fetching dashboard {dashboard_id}: {str(e)}", exc_info=True)
            return None

    def _fetch_dataset_data(self, conn, source_id, query_definition, metrics):
        """Enhanced to handle multiple data source types"""
        try:
            source = self.get_data_source(source_id)
            if not source:
                return [{"error": f"Data source {source_id} not found"}]

            query = query_definition if isinstance(query_definition, str) else query_definition.get(
                "sql") or query_definition.get("query")

            if source['type'].lower() in ['postgresql', 'postgres']:
                # Handle PostgreSQL with schema detection
                matches = re.findall(
                    r'\b(?:from|join)\s+([a-zA-Z_][a-zA-Z0-9_]*)\.', query, flags=re.IGNORECASE)
                external_schema = matches[0] if matches else None

                if external_schema and external_schema != 'public':
                    results = self.postgres_service.run_query(
                        query, schema_override=external_schema)
                else:
                    results = self.postgres_service.run_query(query)
            else:
                # Use DataSourceService for other types
                results = DataSourceService().execute_query(source_id, query_definition)

            return [dict(row) for row in results]

        except Exception as e:
            logger.error(
                f"Data fetch failed for source_id={source_id}: {str(e)}")
            return [{"error": "Data fetch failed"}]

    def create_dataset(self, dataset_data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """
        Create a new dataset and save its fields.

        Expected dataset dict structure:
        {
            "name": "Sales Data (Demo)",
            "description": "Monthly sales data by product category",
            "source_id": 1,
            "query_definition": "SELECT * FROM demo_sales",
            "cache_policy": "none",
            "created_by": "admin",
            "schema": {
                "fields": [
                    { "name": "month", "type": "string", "description": "Month of sale" },
                    { "name": "category", "type": "string", "description": "Product category" },
                    { "name": "revenue", "type": "number", "description": "Revenue in USD" },
                    ...
                ]
            }
        }
        """
        logger.info(f"Creating new dataset: {dataset_data.get('name')}")
        try:
            with self.postgres_service._get_connection() as conn:
                # Insert into datasets table
                insert_dataset_query = """
                INSERT INTO datasets (name, description, source_id, query_definition, cache_policy, created_by, created_at, updated_at, is_active)
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW(), %s)
                RETURNING id
                """

                cache_policy = json.dumps(dataset_data.get('cache_policy', {}))

                dataset_params = (
                    dataset_data["name"],
                    dataset_data.get("description"),
                    dataset_data["source_id"],
                    dataset_data["query_definition"],
                    cache_policy,
                    user_id,
                    True
                )
                dataset_id_result = self._execute_query(
                    conn, insert_dataset_query, dataset_params, fetch_one=True)
                if not dataset_id_result:
                    logger.error("Failed to insert dataset")
                    return None

                dataset_id = dataset_id_result["id"]

                # Get the source type to determine how to handle schema
                source_query = "SELECT type, connection_string FROM data_sources WHERE id = %s"
                source_result = self._execute_query(
                    conn, source_query, (dataset_data['source_id'],))

                if source_result:
                    source_type = source_result[0]['type']

                    # Auto-generate schema and fields based on source type
                    schema_info = self._generate_schema_for_dataset({
                        'id': dataset_id,
                        'source_id': dataset_data['source_id'],
                        'source_type': source_type,
                        'query_definition': dataset_data['query_definition'],
                        'query_type': dataset_data['query_type']
                    })

                # # Insert fields if schema was successfully generated
                fields = dataset_data.get("schema", {}).get("fields", [])
                if schema_info and 'fields' in schema_info:
                    for field in schema_info['fields']:
                        insert_field_query = """
                        INSERT INTO dataset_fields (dataset_id, name, display_name, data_type,
                         format_pattern, is_visible, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                        """

                        field_params = [
                            (
                                dataset_id,
                                field["name"],
                                field.get('display_name', field['name']),
                                field.get("fieldType", "dimension"),
                                field.get('type', 'string'),
                                field.get("format_pattern"),
                                True
                            )
                            for field in fields
                        ]

                        self._execute_batch_query(
                            conn, insert_field_query, field_params, commit=True)
                        
                # Return the created dataset with all information
                return self.get_dataset(dataset_id, user_id)

        except Exception as e:
            logger.error(f"Error creating dataset: {str(e)}", exc_info=True)
            return None

    def update_dataset(self, dataset_id: int, dataset_data: Dict[str, Any],  user_id: str) -> Dict[str, Any]:
        """Update an existing dataset and related information"""
        logger.info(f"Updating dataset {dataset_id}")
        try:
            with self.postgres_service._get_connection() as conn:
                with conn.cursor() as cursor:
                    set_parts = []
                    params = []

                    if "name" in dataset_data:
                        set_parts.append("name = %s")
                        params.append(dataset_data["name"])

                    if "description" in dataset_data:
                        set_parts.append("description = %s")
                        params.append(dataset_data["description"])

                    if "source_id" in dataset_data:
                        set_parts.append("source_id = %s")
                        params.append(dataset_data["source_id"])

                    if "query_type" in dataset_data:
                        set_parts.append("query_type = %s")
                        params.append(dataset_data["query_type"])

                    if "query_definition" in dataset_data:
                        set_parts.append("query_definition = %s")
                        params.append(dataset_data["query_definition"])
                
                    if "cache_policy" in dataset_data:
                        set_parts.append("cache_policy = %s")
                        params.append(json.dumps(dataset_data["cache_policy"]))

                    if "schema" in dataset_data:
                        set_parts.append("schema = %s")
                        params.append(json.dumps(dataset_data["schema"]))

                    if "dataset_id" in dataset_data:
                        set_parts.append("dataset_id = %s")
                        params.append(json.dumps(dataset_data["dataset_id"]))

                    if "user_id" in dataset_data:
                        set_parts.append("user_id = %s")
                        params.append(json.dumps(dataset_data["user_id"]))

                    if not set_parts:
                        return False

                    params.append(dataset_id)
                    query = f"UPDATE datasets SET {', '.join(set_parts)}, updated_at = NOW() WHERE id = %s"
                    cursor.execute(query, params)

                    # If source or query changed, regenerate schema
                    if 'source_id' in dataset_data or 'query_definition' in dataset_data:
                        # Get updated dataset info
                        dataset_query = """
                        SELECT d.*, ds.type as source_type 
                        FROM datasets d
                        JOIN data_sources ds ON d.source_id = ds.id
                        WHERE d.id = %s
                        """
                        dataset_result = self._execute_query(conn, dataset_query, (dataset_id,))
                        
                        if dataset_result:
                            dataset_info = dict(dataset_result[0])
                            
                            # Remove existing fields
                            self._execute_query(conn, "DELETE FROM dataset_fields WHERE dataset_id = %s", (dataset_id,))
                            
                            # Regenerate schema and fields
                            schema_info = self._generate_schema_for_dataset(dataset_info)
                            
                            if schema_info and 'fields' in schema_info:
                                for field in schema_info['fields']:
                                    field_query = """
                                    INSERT INTO fields (
                                        dataset_id, name, display_name, field_type, data_type,
                                        format_pattern, is_visible, created_at, updated_at
                                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                                    """
                                    
                                    self._execute_query(conn, field_query, (
                                        dataset_id,
                                        field['name'],
                                        field.get('display_name', field['name']),
                                        field.get('field_type', 'dimension'),
                                        field.get('type', 'string'),
                                        field.get('format_pattern'),
                                        True
                                    ))

                    affected = cursor.rowcount > 0
                    logger.info(
                        f"Dataset {dataset_id} update {'successful' if affected else 'failed'}")
                    return affected
        except Exception as e:
            logger.error(
                f"Error updating dataset {dataset_id}: {str(e)}", exc_info=True)
            return False

    def delete_dataset(self, dataset_id: int, user_id: str) -> bool:
        """Delete a dataset and all related information"""
        logger.info(f"Deleting dataset {dataset_id}")
        try:
            with self.postgres_service._get_connection() as conn:
                with conn.cursor() as cursor:
                    # First, check if there are any charts using this dataset
                    check_query = "SELECT COUNT(*) FROM charts WHERE dataset_id = %s"
                    cursor.execute(check_query, (dataset_id,))
                    count = cursor.fetchone()[0]

                    if count > 0:
                        logger.warning(
                            f"Cannot delete dataset {dataset_id}: {count} charts are using it")
                        return False

                    # If no dependency, proceed with deletion
                    # Delete related fields first
                    cursor.execute("DELETE FROM dataset_fields WHERE dataset_id = %s", (dataset_id,))

                    query = "DELETE FROM datasets WHERE id = %s"
                    # AND (created_by = %s OR %s IN ( SELECT sub FROM keycloak_users WHERE realm_access->'roles' ? 'admin'
                    cursor.execute(query, (dataset_id,))

                    affected = cursor.rowcount > 0
                    logger.info(
                        f"Dataset {dataset_id} deletion {'successful' if affected else 'failed'}")
                    return affected
        except Exception as e:
            logger.error(
                f"Error deleting dataset {dataset_id}: {str(e)}", exc_info=True)
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
                # data = [dict(zip(columns, row)) for row in result.fetchall()]
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
            logger.error(
                f"Error executing dataset query {dataset_id}: {str(e)}", exc_info=True)
            return {"success": False, "error": str(e)}

    def update_dashboard_items(self, dashboard_id: int, items: List[Dict]) -> bool:
        """Update dashboard items (position, size, etc.)"""
        logger.info(f"Updating items for dashboard {dashboard_id}")
        try:
            with self.postgres_service._get_connection() as conn:
                with conn.cursor() as cursor:
                    # First, remove all existing items for this dashboard
                    cursor.execute(
                        "DELETE FROM dashboard_items WHERE dashboard_id = %s", (dashboard_id,))

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
            logger.error(
                f"Error updating dashboard items for dashboard {dashboard_id}: {str(e)}", exc_info=True)
            return False

    def create_dashboard(self, dashboard_data: dict) -> Optional[int]:
        """Create a new dashboard and assign default permissions"""
        logger.info(f"Creating dashboard: {dashboard_data.get('name')}")
        try:
            with self.postgres_service._get_connection() as conn:
                with conn.cursor() as cur:
                    # Insert dashboard
                    dashboard_query = """
                    INSERT INTO dashboards (
                        name, 
                        description, 
                        layout,
                        global_filters,
                        is_public, 
                        created_by, 
                        created_at, 
                        updated_at,
                        status,
                        classification,
                        owner_id,
                        is_favorited_by,
                        tags,
                        last_viewed,
                        access_roles
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, NOW(), NOW(),
                        %s, %s, %s, %s, %s, %s, %s
                    )
                    RETURNING id
                    """
                    dashboard_params = (
                        dashboard_data['name'],
                        dashboard_data.get('description'),
                        Json(dashboard_data.get('layout', {})),
                        Json(dashboard_data.get('global_filters', {})),
                        dashboard_data.get('is_public', False),
                        dashboard_data.get('created_by', 'system'),
                        dashboard_data.get('status', 'in_dev'),
                        dashboard_data.get('classification'),
                        dashboard_data.get('owner_id'),
                        dashboard_data.get('is_favorited_by', []),
                        dashboard_data.get('tags', []),
                        dashboard_data.get('last_viewed'),
                        dashboard_data.get('access_roles', [])
                    )
                    cur.execute(dashboard_query, dashboard_params)
                    dashboard_id = cur.fetchone()[0]

                    # Prepare default permissions
                    permissions = ['view', 'edit', 'own']
                    permission_query = """
                    INSERT INTO dashboard_permissions (dashboard_id, subject_type, subject_id, permissions)
                    VALUES (%s, %s, %s, %s)
                    """
                    default_roles = ['engineer', 'data_steward', 'admin']
                    permission_params = [
                        (dashboard_id, 'user', dashboard_data.get(
                            'owner_id'), permissions)
                    ] + [
                        (dashboard_id, 'role', role, permissions) for role in default_roles
                    ]

                    for param in permission_params:
                        cur.execute(permission_query, param)

                    conn.commit()
                    return dashboard_id

        except Exception as e:
            logger.error(f"Error creating dashboard: {str(e)}", exc_info=True)
            return None

    def delete_dashboard(self, dashboard_id: int) -> bool:
        """Delete a dashboard and all its items and permissions from the database"""
        logger.info(
            f"Deleting dashboard with ID: {dashboard_id} and its items")
        try:
            with self.postgres_service._get_connection() as conn:
                # Step 1: Delete dashboard items
                delete_items_query = """
                DELETE FROM dashboard_items 
                WHERE dashboard_id = %s
                """
                self._execute_query(conn, delete_items_query, (dashboard_id,))

                # Step 2: Delete dashboard permissions
                delete_permissions_query = """
                DELETE FROM dashboard_permissions 
                WHERE dashboard_id = %s
                """
                self._execute_query(
                    conn, delete_permissions_query, (dashboard_id,))

                # Step 3: Delete the dashboard itself
                delete_dashboard_query = """
                DELETE FROM dashboards 
                WHERE id = %s
                """
                result = self._execute_query(
                    conn, delete_dashboard_query, (dashboard_id,))
                return result is not None and result.rowcount > 0

        except Exception as e:
            logger.error(
                f"Error deleting dashboard {dashboard_id}: {str(e)}", exc_info=True)
            return False

    def update_dashboard(self, dashboard_id: int, data: dict) -> bool:
        try:
            with self.postgres_service._get_connection() as conn:
                with conn.cursor() as cur:
                    # 1. Update fields in the dashboards table
                    fields = []
                    values = []

                    allowed_fields = [
                        "name", "description", "layout", "global_filters",
                        "is_public", "status", "classification", "tags", "access_roles"
                    ]

                    for key in allowed_fields:
                        if key in data:
                            value = data[key]
                            if key in ("layout", "global_filters") and isinstance(value, dict):
                                value = json.dumps(value)
                            fields.append(f"{key} = %s")
                            values.append(value)

                    fields.append("updated_at = %s")
                    values.append(datetime.utcnow())

                    if fields:
                        query = f"""
                            UPDATE dashboards
                            SET {', '.join(fields)}
                            WHERE id = %s
                        """
                        values.append(dashboard_id)
                        cur.execute(query, tuple(values))

                    # 2. Replace all dashboard_items for this dashboard
                    if "items" in data:
                        # Delete old items
                        cur.execute(
                            "DELETE FROM dashboard_items WHERE dashboard_id = %s", (dashboard_id,))

                        # Insert new items
                        now = datetime.timezone.utc()
                        for item in data["items"]:
                            chart_id = item.get("chart_id")
                            if chart_id is None:
                                continue  # skip invalid items
                            cur.execute(
                                """
                                INSERT INTO dashboard_items (
                                    dashboard_id,
                                    chart_id,
                                    position_x,
                                    position_y,
                                    width,
                                    height,
                                    config,
                                    created_at,
                                    updated_at
                                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                                """,
                                (
                                    dashboard_id,
                                    chart_id,
                                    item.get("x", 0),
                                    item.get("y", 0),
                                    item.get("width", 6),
                                    item.get("height", 4),
                                    json.dumps(item.get("config", {})),
                                    now,
                                    now,
                                )
                            )

                conn.commit()
                return True

        except Exception as e:
            print(f"Error updating dashboard {dashboard_id}:", e)
            return False
