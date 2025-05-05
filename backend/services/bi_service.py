
import logging
import json
from datetime import datetime
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class BIService:
    """
    Service for BI-related operations such as data sources, datasets,
    charts, dashboards, and queries.
    """
    
    def __init__(self):
        """Initialize the BIService"""
        # For demonstration purposes, we'll use in-memory data
        # In a real application, you would connect to a database
        self.data_sources = [
            {
                "id": 1,
                "name": "Sample PostgreSQL Database",
                "type": "postgresql",
                "connection_string": "postgresql://user:password@localhost:5432/sample",
                "config": {"schema": "public"},
                "is_active": True,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "created_by": "admin"
            },
            {
                "id": 2,
                "name": "Sample MySQL Database",
                "type": "mysql",
                "connection_string": "mysql://user:password@localhost:3306/sample",
                "is_active": True,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "created_by": "admin"
            }
        ]
        
        self.datasets = [
            {
                "id": 1,
                "name": "Sample User Activity",
                "description": "User activity data from web application",
                "source_id": 1,
                "source_name": "Sample PostgreSQL Database",
                "query_type": "sql",
                "query_value": "SELECT * FROM user_activity",
                "schema": {"fields": [
                    {"name": "id", "type": "integer"},
                    {"name": "user_id", "type": "integer"},
                    {"name": "action", "type": "string"},
                    {"name": "timestamp", "type": "datetime"}
                ]},
                "dimensions": {
                    "user_id": {"display_name": "User ID"},
                    "action": {"display_name": "Action"} 
                },
                "metrics": {
                    "count": {"display_name": "Count", "aggregation": "count"}
                },
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "last_refreshed_at": datetime.now().isoformat(),
                "created_by": "admin"
            },
            {
                "id": 2,
                "name": "Product Sales",
                "description": "Monthly product sales data",
                "source_id": 2,
                "source_name": "Sample MySQL Database",
                "query_type": "sql",
                "query_value": "SELECT * FROM sales",
                "schema": {"fields": [
                    {"name": "id", "type": "integer"},
                    {"name": "product_id", "type": "integer"},
                    {"name": "quantity", "type": "integer"},
                    {"name": "price", "type": "decimal"},
                    {"name": "sale_date", "type": "date"}
                ]},
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "created_by": "admin"
            }
        ]
        
        self.charts = [
            {
                "id": 1,
                "name": "User Activity by Action",
                "description": "Bar chart showing user activity by action type",
                "dataset_id": 1,
                "dataset_name": "Sample User Activity",
                "chart_type": "bar",
                "config": {
                    "x_axis": "action",
                    "y_axis": "count",
                    "color_by": "action"
                },
                "dimensions": ["action"],
                "metrics": ["count"],
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "created_by": "admin"
            }
        ]
        
        self.dashboards = [
            {
                "id": 1,
                "name": "User Analytics Dashboard",
                "description": "Overview of user activity and engagement",
                "is_public": True,
                "layout": [
                    {"id": 1, "chart_id": 1, "x": 0, "y": 0, "width": 12, "height": 6}
                ],
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "created_by": "admin",
                "item_count": 1
            }
        ]

    # Data Sources methods
    def get_data_sources(self) -> List[Dict[str, Any]]:
        """Get all data sources"""
        return self.data_sources
    
    def get_data_source(self, source_id: int) -> Optional[Dict[str, Any]]:
        """Get a single data source by ID"""
        for source in self.data_sources:
            if source["id"] == source_id:
                return source
        return None
    
    def test_data_source_connection(self, source_id: int) -> Dict[str, Any]:
        """Test the connection to a data source"""
        source = self.get_data_source(source_id)
        if not source:
            return {"success": False, "error": f"Data source with ID {source_id} not found"}
        
        # In a real app, you would actually test the connection here
        # For demo purposes, we'll just return success
        return {"success": True, "message": "Connection successful"}
    
    def create_data_source(self, data: Dict[str, Any]) -> int:
        """Create a new data source"""
        # Generate new ID (in a real app, this would be done by the database)
        new_id = max([source["id"] for source in self.data_sources], default=0) + 1
        
        # Create new data source
        new_source = {
            "id": new_id,
            "name": data["name"],
            "type": data["type"],
            "connection_string": data.get("connection_string"),
            "config": data.get("config", {}),
            "is_active": True,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "created_by": data.get("created_by", "admin")
        }
        
        self.data_sources.append(new_source)
        return new_id
    
    def update_data_source(self, source_id: int, data: Dict[str, Any]) -> bool:
        """Update an existing data source"""
        for i, source in enumerate(self.data_sources):
            if source["id"] == source_id:
                # Update the source
                for key, value in data.items():
                    if value is not None:  # Only update non-None values
                        source[key] = value
                
                source["updated_at"] = datetime.now().isoformat()
                self.data_sources[i] = source
                return True
        
        return False
    
    def delete_data_source(self, source_id: int) -> bool:
        """Delete a data source"""
        for i, source in enumerate(self.data_sources):
            if source["id"] == source_id:
                # Check if any datasets are using this data source
                for dataset in self.datasets:
                    if dataset["source_id"] == source_id:
                        return False  # Can't delete, being used by a dataset
                
                del self.data_sources[i]
                return True
        
        return False

    # Datasets methods
    def get_datasets(self) -> List[Dict[str, Any]]:
        """Get all datasets"""
        # Add source name to each dataset
        for dataset in self.datasets:
            for source in self.data_sources:
                if source["id"] == dataset["source_id"]:
                    dataset["source_name"] = source["name"]
                    break
        
        return self.datasets
    
    def get_dataset(self, dataset_id: int) -> Optional[Dict[str, Any]]:
        """Get a single dataset by ID"""
        for dataset in self.datasets:
            if dataset["id"] == dataset_id:
                # Add source name
                for source in self.data_sources:
                    if source["id"] == dataset["source_id"]:
                        dataset["source_name"] = source["name"]
                        break
                return dataset
        return None
    
    def create_dataset(self, data: Dict[str, Any]) -> int:
        """Create a new dataset"""
        # Generate new ID
        new_id = max([dataset["id"] for dataset in self.datasets], default=0) + 1
        
        # Create new dataset
        new_dataset = {
            "id": new_id,
            "name": data["name"],
            "description": data.get("description"),
            "source_id": data["source_id"],
            "query_type": data["query_type"],
            "query_value": data["query_value"],
            "schema": data.get("schema") or data.get("schema_definition", {}),  # Support both naming conventions
            "dimensions": data.get("dimensions", {}),
            "metrics": data.get("metrics", {}),
            "filters": data.get("filters", {}),
            "cache_policy": data.get("cache_policy", {}),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "created_by": data.get("created_by", "admin")
        }
        
        # Add source name
        for source in self.data_sources:
            if source["id"] == new_dataset["source_id"]:
                new_dataset["source_name"] = source["name"]
                break
        
        self.datasets.append(new_dataset)
        return new_id
    
    def update_dataset(self, dataset_id: int, data: Dict[str, Any]) -> bool:
        """Update an existing dataset"""
        for i, dataset in enumerate(self.datasets):
            if dataset["id"] == dataset_id:
                # Update the dataset
                for key, value in data.items():
                    if value is not None:  # Only update non-None values
                        # Handle the schema field specially
                        if key == "schema" or key == "schema_definition":
                            dataset["schema"] = value
                        else:
                            dataset[key] = value
                
                dataset["updated_at"] = datetime.now().isoformat()
                
                # Update source name if source_id was changed
                if "source_id" in data:
                    for source in self.data_sources:
                        if source["id"] == dataset["source_id"]:
                            dataset["source_name"] = source["name"]
                            break
                
                self.datasets[i] = dataset
                return True
        
        return False
    
    def delete_dataset(self, dataset_id: int) -> bool:
        """Delete a dataset"""
        for i, dataset in enumerate(self.datasets):
            if dataset["id"] == dataset_id:
                # Check if any charts are using this dataset
                for chart in self.charts:
                    if chart["dataset_id"] == dataset_id:
                        return False  # Can't delete, being used by a chart
                
                del self.datasets[i]
                return True
        
        return False
    
    def execute_dataset_query(self, dataset_id: int, filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Execute a query on a dataset"""
        dataset = self.get_dataset(dataset_id)
        if not dataset:
            return {"success": False, "error": f"Dataset with ID {dataset_id} not found"}
        
        # In a real app, you would execute the actual query here
        # For demo purposes, we'll just return some sample data
        sample_data = []
        
        # Generate different sample data based on the dataset
        if "User Activity" in dataset["name"]:
            sample_data = [
                {"id": 1, "user_id": 101, "action": "login", "timestamp": "2025-05-01T08:30:00Z"},
                {"id": 2, "user_id": 102, "action": "view_page", "timestamp": "2025-05-01T09:15:00Z"},
                {"id": 3, "user_id": 101, "action": "click_button", "timestamp": "2025-05-01T08:35:00Z"},
                {"id": 4, "user_id": 103, "action": "login", "timestamp": "2025-05-01T10:00:00Z"},
                {"id": 5, "user_id": 102, "action": "logout", "timestamp": "2025-05-01T11:45:00Z"}
            ]
        elif "Sales" in dataset["name"]:
            sample_data = [
                {"id": 1, "product_id": 201, "quantity": 5, "price": 19.99, "sale_date": "2025-04-15"},
                {"id": 2, "product_id": 202, "quantity": 2, "price": 49.99, "sale_date": "2025-04-16"},
                {"id": 3, "product_id": 203, "quantity": 1, "price": 99.99, "sale_date": "2025-04-16"},
                {"id": 4, "product_id": 201, "quantity": 3, "price": 19.99, "sale_date": "2025-04-17"},
                {"id": 5, "product_id": 204, "quantity": 10, "price": 9.99, "sale_date": "2025-04-18"}
            ]
        else:
            # Default sample data
            sample_data = [
                {"column1": "value1", "column2": 10, "column3": True},
                {"column1": "value2", "column2": 20, "column3": False},
                {"column1": "value3", "column2": 30, "column3": True}
            ]
            
        # Convert any complex objects to JSON-serializable format
        for item in sample_data:
            for key, value in item.items():
                if not isinstance(value, (str, int, float, bool, type(None))):
                    item[key] = str(value)
        
        return {
            "success": True,
            "data": sample_data,
            "metadata": {
                "total_rows": len(sample_data),
                "query_time_ms": 42  # Simulated query time
            }
        }

    # Charts methods
    def get_charts(self) -> List[Dict[str, Any]]:
        """Get all charts"""
        return self.charts
    
    def get_chart(self, chart_id: int) -> Optional[Dict[str, Any]]:
        """Get a single chart by ID"""
        for chart in self.charts:
            if chart["id"] == chart_id:
                return chart
        return None
    
    def create_chart(self, data: Dict[str, Any]) -> int:
        """Create a new chart"""
        # Generate new ID
        new_id = max([chart["id"] for chart in self.charts], default=0) + 1
        
        # Find dataset name
        dataset_name = ""
        for dataset in self.datasets:
            if dataset["id"] == data["dataset_id"]:
                dataset_name = dataset["name"]
                break
        
        # Create new chart
        new_chart = {
            "id": new_id,
            "name": data["name"],
            "description": data.get("description"),
            "dataset_id": data["dataset_id"],
            "dataset_name": dataset_name,
            "chart_type": data["chart_type"],
            "config": data.get("config", {}),
            "dimensions": data.get("dimensions", []),
            "metrics": data.get("metrics", []),
            "filters": data.get("filters", {}),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "created_by": data.get("created_by", "admin")
        }
        
        self.charts.append(new_chart)
        return new_id
    
    def update_chart(self, chart_id: int, data: Dict[str, Any]) -> bool:
        """Update an existing chart"""
        for i, chart in enumerate(self.charts):
            if chart["id"] == chart_id:
                # Update the chart
                for key, value in data.items():
                    if value is not None:  # Only update non-None values
                        chart[key] = value
                
                # If dataset_id changed, update dataset_name
                if "dataset_id" in data:
                    for dataset in self.datasets:
                        if dataset["id"] == chart["dataset_id"]:
                            chart["dataset_name"] = dataset["name"]
                            break
                
                chart["updated_at"] = datetime.now().isoformat()
                self.charts[i] = chart
                return True
        
        return False
    
    def delete_chart(self, chart_id: int) -> bool:
        """Delete a chart"""
        for i, chart in enumerate(self.charts):
            if chart["id"] == chart_id:
                # Remove chart from any dashboards
                for dashboard in self.dashboards:
                    dashboard["layout"] = [item for item in dashboard["layout"] if item["chart_id"] != chart_id]
                    dashboard["item_count"] = len(dashboard["layout"])
                
                del self.charts[i]
                return True
        
        return False

    # Dashboards methods
    def get_dashboards(self) -> List[Dict[str, Any]]:
        """Get all dashboards"""
        return self.dashboards
    
    def get_dashboard(self, dashboard_id: int) -> Optional[Dict[str, Any]]:
        """Get a single dashboard by ID"""
        for dashboard in self.dashboards:
            if dashboard["id"] == dashboard_id:
                return dashboard
        return None
    
    def create_dashboard(self, data: Dict[str, Any]) -> int:
        """Create a new dashboard"""
        # Generate new ID
        new_id = max([dashboard["id"] for dashboard in self.dashboards], default=0) + 1
        
        # Create new dashboard
        new_dashboard = {
            "id": new_id,
            "name": data["name"],
            "description": data.get("description"),
            "is_public": data.get("is_public", False),
            "layout": data.get("layout", []),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "created_by": data.get("created_by", "admin"),
            "item_count": len(data.get("layout", []))
        }
        
        self.dashboards.append(new_dashboard)
        return new_id
    
    def update_dashboard(self, dashboard_id: int, data: Dict[str, Any]) -> bool:
        """Update an existing dashboard"""
        for i, dashboard in enumerate(self.dashboards):
            if dashboard["id"] == dashboard_id:
                # Update the dashboard
                for key, value in data.items():
                    if value is not None:  # Only update non-None values
                        dashboard[key] = value
                
                # Update item_count if layout was changed
                if "layout" in data:
                    dashboard["item_count"] = len(dashboard["layout"])
                
                dashboard["updated_at"] = datetime.now().isoformat()
                self.dashboards[i] = dashboard
                return True
        
        return False
    
    def delete_dashboard(self, dashboard_id: int) -> bool:
        """Delete a dashboard"""
        for i, dashboard in enumerate(self.dashboards):
            if dashboard["id"] == dashboard_id:
                del self.dashboards[i]
                return True
        
        return False
    
    def add_chart_to_dashboard(self, dashboard_id: int, chart_id: int, position: Dict[str, int]) -> bool:
        """Add a chart to a dashboard"""
        dashboard = self.get_dashboard(dashboard_id)
        chart = self.get_chart(chart_id)
        
        if not dashboard or not chart:
            return False
        
        # Create new layout item
        new_item = {
            "id": max([item.get("id", 0) for item in dashboard["layout"]], default=0) + 1,
            "chart_id": chart_id,
            "x": position.get("x", 0),
            "y": position.get("y", 0),
            "width": position.get("width", 12),
            "height": position.get("height", 6)
        }
        
        dashboard["layout"].append(new_item)
        dashboard["item_count"] = len(dashboard["layout"])
        dashboard["updated_at"] = datetime.now().isoformat()
        
        return True
    
    def remove_chart_from_dashboard(self, dashboard_id: int, item_id: int) -> bool:
        """Remove a chart from a dashboard"""
        dashboard = self.get_dashboard(dashboard_id)
        
        if not dashboard:
            return False
        
        original_length = len(dashboard["layout"])
        dashboard["layout"] = [item for item in dashboard["layout"] if item["id"] != item_id]
        
        if len(dashboard["layout"]) < original_length:
            dashboard["item_count"] = len(dashboard["layout"])
            dashboard["updated_at"] = datetime.now().isoformat()
            return True
        
        return False
