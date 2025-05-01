
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta

class StatsService:
    def __init__(self):
        self.conn_params = {
            "host": os.environ.get("POSTGRES_HOST", "localhost"),
            "port": os.environ.get("POSTGRES_PORT", "5432"),
            "user": os.environ.get("POSTGRES_USER", "postgres"),
            "password": os.environ.get("POSTGRES_PASSWORD", "postgres"),
            "dbname": os.environ.get("POSTGRES_DB", "spark_rapids")
        }

    def _get_connection(self):
        return psycopg2.connect(**self.conn_params)

    def get_dashboard_stats(self):
        with self._get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Total jobs
                cursor.execute("SELECT COUNT(*) as total_jobs FROM jobs")
                total_jobs = cursor.fetchone()["total_jobs"]

                # Successful jobs
                cursor.execute("SELECT COUNT(*) as successful_jobs FROM jobs WHERE status = 'completed'")
                successful_jobs = cursor.fetchone()["successful_jobs"]

                # Calculate job growth trend (compared to previous period)
                now = datetime.now()
                one_month_ago = now - timedelta(days=30)
                two_months_ago = now - timedelta(days=60)
                
                cursor.execute("SELECT COUNT(*) as current_period FROM jobs WHERE start_time >= %s", (one_month_ago,))
                current_period_jobs = cursor.fetchone()["current_period"]
                
                cursor.execute("""
                    SELECT COUNT(*) as previous_period 
                    FROM jobs 
                    WHERE start_time >= %s AND start_time < %s
                """, (two_months_ago, one_month_ago))
                previous_period_jobs = cursor.fetchone()["previous_period"]
                
                if previous_period_jobs > 0:
                    trend_percent = int(((current_period_jobs - previous_period_jobs) / previous_period_jobs) * 100)
                    trend_positive = trend_percent > 0
                else:
                    trend_percent = 0
                    trend_positive = True

                # Calculate average speedup based on results column
                cursor.execute("""
                    SELECT AVG((results->>'speedupFactor')::float) as avg_speedup
                    FROM jobs 
                    WHERE results IS NOT NULL AND results ? 'speedupFactor'
                """)
                result = cursor.fetchone()
                avg_speedup = round(result["avg_speedup"] or 0, 1)
                
                # Calculate cost savings (simplified calculation)
                cursor.execute("""
                    SELECT COUNT(*) as optimized_jobs
                    FROM jobs 
                    WHERE status = 'completed' AND results IS NOT NULL
                """)
                optimized_jobs = cursor.fetchone()["optimized_jobs"]
                
                cost_savings = 0
                if total_jobs > 0:
                    cost_savings = int((optimized_jobs / total_jobs) * 100) if total_jobs > 0 else 0
                
                return {
                    "total_jobs": total_jobs,
                    "successful_jobs": successful_jobs,
                    "job_trend": {
                        "value": abs(trend_percent),
                        "positive": trend_positive
                    },
                    "avg_speedup": avg_speedup,
                    "cost_savings": cost_savings
                }
