
# Add this to your main.py file where the other API endpoints are defined

@app.get("/api/bi/charts/{chart_id}/data")
def get_chart_data(chart_id: int):
    """Get data for a specific chart"""
    try:
        bi_service = BIService()
        chart = bi_service.get_chart(chart_id)
        
        if not chart:
            raise HTTPException(status_code=404, detail=f"Chart with ID {chart_id} not found")
        
        # Fetch the dataset associated with this chart
        dataset_id = chart["dataset_id"]
        
        # Execute the query with filters from the chart
        result = bi_service.execute_dataset_query(
            dataset_id, 
            filters=chart.get("filters", {})
        )
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return result
    except Exception as e:
        logger.error(f"Error fetching chart data: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/bi/dashboards/{dashboard_id}")
def update_dashboard(dashboard_id: int, data: dict):
    """Update a dashboard"""
    try:
        bi_service = BIService()
        
        # Check if dashboard exists
        existing_dashboard = bi_service.get_dashboard(dashboard_id)
        if not existing_dashboard:
            raise HTTPException(status_code=404, detail=f"Dashboard with ID {dashboard_id} not found")
        
        # Update dashboard items if provided
        if "items" in data:
            result = bi_service.update_dashboard_items(dashboard_id, data["items"])
            if not result:
                raise HTTPException(status_code=500, detail="Failed to update dashboard items")
        
        # Update other dashboard properties if needed
        updated_fields = {k: v for k, v in data.items() if k != "items"}
        if updated_fields:
            result = bi_service.update_dashboard(dashboard_id, updated_fields)
            if not result:
                raise HTTPException(status_code=500, detail="Failed to update dashboard")
        
        # Return the updated dashboard
        updated_dashboard = bi_service.get_dashboard(dashboard_id)
        return updated_dashboard
    except Exception as e:
        logger.error(f"Error updating dashboard: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
