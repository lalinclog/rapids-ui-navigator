
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import json
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PostgresService:
    def __init__(self):
        self.conn_params = {
            "host": os.environ.get("POSTGRES_HOST", "localhost"),
            "port": os.environ.get("POSTGRES_PORT", "5432"),
            "user": os.environ.get("POSTGRES_USER", "postgres"),
            "password": os.environ.get("POSTGRES_PASSWORD", "postgres"),
            "dbname": os.environ.get("POSTGRES_DB", "spark_rapids")
        }
        logger.info(f"PostgresService initialized with connection params: {self.conn_params}")

    def _get_connection(self):
        try:
            logger.debug("Opening new database connection")
            return psycopg2.connect(**self.conn_params)
        except Exception as e:
            logger.error(f"Failed to connect to database: {str(e)}", exc_info=True)
            raise

    def create_job(self, job_data):
        logger.info(f"Creating new job: {job_data['name']} (type: {job_data['type']})")
        with self._get_connection() as conn:
            with conn.cursor() as cursor:
                try:
                    cursor.execute("""
                        INSERT INTO jobs 
                        (name, type, status, user_id, event_log_path, application_name, 
                         output_format, additional_options)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (
                        job_data["name"],
                        job_data["type"],
                        job_data["status"],
                        job_data["user_id"],
                        job_data["event_log_path"],
                        job_data["application_name"],
                        job_data["output_format"],
                        job_data["additional_options"]
                    ))
                    job_id = cursor.fetchone()[0]
                    logger.info(f"Successfully created job with ID: {job_id}")
                    return job_id
                except Exception as e:
                    logger.error(f"Error creating job: {str(e)}", exc_info=True)
                    conn.rollback()
                    raise

    def update_job(self, job_id, update_data):
        logger.info(f"Updating job {job_id} with data: {update_data}")
        set_clauses = []
        values = []
        
        for key, value in update_data.items():
            column_name = key.lower()
            if key == "results" and isinstance(value, (dict, list)):
                value = json.dumps(value)
            
            set_clauses.append(f"{column_name} = %s")
            values.append(value)
        
        if not set_clauses:
            logger.warning(f"No valid data provided to update job {job_id}")
            return False
        
        sql = f"UPDATE jobs SET {', '.join(set_clauses)} WHERE id = %s"
        values.append(job_id)
        
        with self._get_connection() as conn:
            with conn.cursor() as cursor:
                try:
                    cursor.execute(sql, values)
                    affected = cursor.rowcount > 0
                    logger.info(f"Job {job_id} update {'successful' if affected else 'failed (no rows affected)'}")
                    return affected
                except Exception as e:
                    logger.error(f"Error updating job {job_id}: {str(e)}", exc_info=True)
                    conn.rollback()
                    raise

    def get_jobs(self):
        logger.info("Retrieving all jobs")
        try:
            with self._get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute("""
                        SELECT id, name, type, status, progress, 
                               start_time, end_time, user_id as user, 
                               event_log_path, application_name,
                               output_format, additional_options, output_path
                        FROM jobs
                        ORDER BY start_time DESC
                    """)
                    jobs = cursor.fetchall()
                    
                    # Convert to list if it's not already (sometimes psycopg2 returns a specialized cursor object)
                    jobs = list(jobs) if jobs else []
                    
                    logger.info(f"Retrieved {len(jobs)} jobs from database")
                    
                    # Convert datetime objects to ISO format strings
                    for job in jobs:
                        if job['start_time']:
                            job['start_time'] = job['start_time'].isoformat()
                        if job['end_time']:
                            job['end_time'] = job['end_time'].isoformat()
                    
                    logger.debug(f"Returning jobs: {jobs}")
                    return jobs
        except Exception as e:
            logger.error(f"Error fetching jobs: {str(e)}", exc_info=True)
            return []  # Return empty list on error

    def get_job(self, job_id):
        logger.info(f"Retrieving job with ID: {job_id}")
        try:
            with self._get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute("""
                        SELECT id, name, type, status, progress, 
                               start_time, end_time, user_id as user, 
                               event_log_path, application_name,
                               output_format, additional_options, output_path, results
                        FROM jobs
                        WHERE id = %s
                    """, (job_id,))
                    job = cursor.fetchone()
                    
                    if job:
                        logger.info(f"Found job {job_id}: {job['name']} (status: {job['status']})")
                        # Convert datetime objects to ISO format strings
                        if job['start_time']:
                            job['start_time'] = job['start_time'].isoformat()
                        if job['end_time']:
                            job['end_time'] = job['end_time'].isoformat()
                    else:
                        logger.warning(f"Job with ID {job_id} not found")
                    
                    return job
        except Exception as e:
            logger.error(f"Error fetching job {job_id}: {str(e)}", exc_info=True)
            return None  # Return None on error
