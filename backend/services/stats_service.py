import os
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class StatsService:
    def __init__(self):
        self.conn_params = {
            "host": os.environ.get("POSTGRES_HOST", "localhost"),
            "port": os.environ.get("POSTGRES_PORT", "5432"),
            "user": os.environ.get("POSTGRES_USER", "postgres"),
            "password": os.environ.get("POSTGRES_PASSWORD", "postgres"),
            "dbname": os.environ.get("POSTGRES_DB", "spark_rapids")
        }
        logger.info(f"StatsService initialized with connection params: {self.conn_params}")

    def _get_connection(self):
        return psycopg2.connect(**self.conn_params)

    def get_dashboard_stats(self):
        logger.info("Fetching dashboard stats")
        try:
            with self._get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    # Total jobs
                    cursor.execute("SELECT COUNT(*) as total_jobs FROM jobs")
                    result = cursor.fetchone()
                    logger.info(f"Total jobs query result: {result}")
                    total_jobs = result["total_jobs"] if result else 0
                    logger.info(f"Total jobs: {total_jobs}")

                    # Successful jobs
                    cursor.execute("SELECT COUNT(*) as successful_jobs FROM jobs WHERE status = 'completed'")
                    result = cursor.fetchone()
                    logger.info(f"Successful jobs query result: {result}")
                    successful_jobs = result["successful_jobs"] if result else 0
                    logger.info(f"Successful jobs: {successful_jobs}")

                    # Calculate job growth trend (compared to previous period)
                    now = datetime.now()
                    one_month_ago = now - timedelta(days=30)
                    two_months_ago = now - timedelta(days=60)
                    
                    cursor.execute("SELECT COUNT(*) as current_period FROM jobs WHERE start_time >= %s", (one_month_ago,))
                    result = cursor.fetchone()
                    logger.info(f"Current period jobs query result: {result}")
                    current_period_jobs = result["current_period"] if result else 0
                    
                    cursor.execute("""
                        SELECT COUNT(*) as previous_period 
                        FROM jobs 
                        WHERE start_time >= %s AND start_time < %s
                    """, (two_months_ago, one_month_ago))
                    result = cursor.fetchone()
                    logger.info(f"Previous period jobs query result: {result}")
                    previous_period_jobs = result["previous_period"] if result else 0
                    
                    logger.info(f"Current period jobs: {current_period_jobs}, Previous period jobs: {previous_period_jobs}")
                    
                    if previous_period_jobs > 0:
                        trend_percent = int(((current_period_jobs - previous_period_jobs) / previous_period_jobs) * 100)
                        trend_positive = trend_percent > 0
                    else:
                        trend_percent = 0
                        trend_positive = True
                    
                    logger.info(f"Job trend: value={trend_percent}, positive={trend_positive}")

                    # Calculate average speedup based on results column
                    cursor.execute("""
                        SELECT AVG((results->>'speedupFactor')::float) as avg_speedup
                        FROM jobs 
                        WHERE results IS NOT NULL AND results ? 'speedupFactor'
                    """)
                    result = cursor.fetchone()
                    logger.info(f"Average speedup query result: {result}")
                    avg_speedup = round(result["avg_speedup"] or 0, 1)
                    logger.info(f"Average speedup: {avg_speedup}")
                    
                    # Calculate cost savings (simplified calculation)
                    cursor.execute("""
                        SELECT COUNT(*) as optimized_jobs
                        FROM jobs 
                        WHERE status = 'completed' AND results IS NOT NULL
                    """)
                    result = cursor.fetchone()
                    logger.info(f"Optimized jobs query result: {result}")
                    optimized_jobs = result["optimized_jobs"] if result else 0
                    
                    cost_savings = 0
                    if total_jobs > 0:
                        cost_savings = int((optimized_jobs / total_jobs) * 100)
                    
                    logger.info(f"Cost savings: {cost_savings}%")

                    stats = {
                        "total_jobs": total_jobs,
                        "successful_jobs": successful_jobs,
                        "job_trend": {
                            "value": abs(trend_percent),
                            "positive": trend_positive
                        },
                        "avg_speedup": avg_speedup,
                        "cost_savings": cost_savings
                    }
                    
                    logger.info(f"Returning dashboard stats: {stats}")
                    return stats
                    
        except Exception as e:
            logger.error(f"Error fetching dashboard stats: {str(e)}", exc_info=True)
            # Return default values in case of error
            return {
                "total_jobs": 0,
                "successful_jobs": 0,
                "job_trend": {
                    "value": 0,
                    "positive": True
                },
                "avg_speedup": 0,
                "cost_savings": 0
            }
