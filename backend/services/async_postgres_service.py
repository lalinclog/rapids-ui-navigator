import os
import logging
import asyncio
import asyncpg
from asyncpg.pool import Pool
from datetime import datetime
import json
from typing import Optional, List, Dict, Any, Union

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AsyncPostgresService:
    _instance = None
    _lock = asyncio.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AsyncPostgresService, cls).__new__(cls)
        return cls._instance
        
    def __init__(self):
        if not hasattr(self, 'initialized'):
            self.conn_params = {
                "host": os.environ.get("POSTGRES_HOST", "localhost"),
                "port": os.environ.get("POSTGRES_PORT", "5432"),
                "user": os.environ.get("POSTGRES_USER", "postgres"),
                "password": os.environ.get("POSTGRES_PASSWORD", "postgres"),
                "database": os.environ.get("POSTGRES_DB", "spark_rapids")
            }
            
            self.pool: Optional[Pool] = None
            self.min_size = int(os.environ.get("PG_POOL_MIN_SIZE", "2"))
            self.max_size = int(os.environ.get("PG_POOL_MAX_SIZE", "10"))
            
            # Circuit breaker pattern
            self.circuit_open = False
            self.circuit_open_time = None
            self.circuit_timeout = 30  # seconds
            self.failure_threshold = 5
            self.failure_count = 0
            
            logger.info(f"AsyncPostgresService initialized with connection params: {self.conn_params}")
            self.initialized = True
    
    async def create_pool(self):
        """Create connection pool if it doesn't exist"""
        if self.pool is None or self.pool.closed:
            logger.info(f"Creating database pool with size {self.min_size}-{self.max_size}")
            try:
                self.pool = await asyncpg.create_pool(
                    min_size=self.min_size,
                    max_size=self.max_size,
                    **self.conn_params
                )
                # Reset circuit breaker on successful pool creation
                self.circuit_open = False
                self.failure_count = 0
            except Exception as e:
                logger.error(f"Failed to create database pool: {str(e)}", exc_info=True)
                self.failure_count += 1
                self._check_circuit_breaker()
                raise
    
    def _check_circuit_breaker(self):
        """Check and potentially open the circuit breaker"""
        if self.failure_count >= self.failure_threshold:
            self.circuit_open = True
            self.circuit_open_time = datetime.now()
            logger.warning("Circuit breaker opened due to multiple database failures")
    
    async def _check_circuit_status(self):
        """Check if circuit breaker is open and if timeout has passed"""
        if self.circuit_open:
            elapsed = (datetime.now() - self.circuit_open_time).total_seconds()
            if elapsed > self.circuit_timeout:
                logger.info("Circuit breaker timeout passed, allowing retry")
                self.circuit_open = False
                self.failure_count = 0
            else:
                raise Exception(f"Database service unavailable (circuit breaker open for {elapsed:.1f}s)")
    
    async def execute_query(self, query: str, params: tuple = None, fetch: bool = False) -> Union[List[Dict[str, Any]], Dict[str, Any], None]:
        """Execute an async SQL query"""
        await self._check_circuit_status()
        
        if self.pool is None or self.pool.closed:
            await self.create_pool()
        
        try:
            async with self.pool.acquire() as conn:
                if fetch:
                    result = await conn.fetch(query, *(params or ()))
                    return [dict(row) for row in result]
                elif "RETURNING" in query.upper():
                    result = await conn.fetchrow(query, *(params or ()))
                    return dict(result) if result else None
                else:
                    await conn.execute(query, *(params or ()))
                    return None
        except Exception as e:
            logger.error(f"Query failed: {str(e)}", exc_info=True)
            self.failure_count += 1
            self._check_circuit_breaker()
            raise
    
    async def close(self):
        """Close the connection pool"""
        if self.pool:
            await self.pool.close()
            logger.info("Database connection pool closed")
    
    async def create_job(self, job_data: Dict[str, Any]) -> int:
        """Create a new job asynchronously"""
        logger.info(f"Creating new job: {job_data.get('name')} (type: {job_data.get('type')})")
        
        query = """
            INSERT INTO jobs 
            (name, type, status, user_id, event_log_path, application_name, 
            output_format, additional_options)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        """
        
        result = await self.execute_query(query, (
            job_data.get("name"),
            job_data.get("type"),
            job_data.get("status"),
            job_data.get("user_id"),
            job_data.get("event_log_path"),
            job_data.get("application_name"),
            job_data.get("output_format"),
            job_data.get("additional_options")
        ))
        
        job_id = result.get("id") if result else None
        logger.info(f"Created job with ID: {job_id}")
        return job_id
    
    async def update_job(self, job_id: int, update_data: Dict[str, Any]) -> bool:
        """Update a job asynchronously"""
        logger.info(f"Updating job {job_id} with data: {update_data}")
        
        set_clauses = []
        values = []
        param_idx = 1
        
        for key, value in update_data.items():
            column_name = key.lower()
            if key == "results" and isinstance(value, (dict, list)):
                value = json.dumps(value)
            
            set_clauses.append(f"{column_name} = ${param_idx}")
            values.append(value)
            param_idx += 1
            
        if not set_clauses:
            logger.warning(f"No valid data provided to update job {job_id}")
            return False
            
        values.append(job_id)
        sql = f"UPDATE jobs SET {', '.join(set_clauses)} WHERE id = ${param_idx}"
        
        try:
            await self.execute_query(sql, tuple(values))
            return True
        except Exception as e:
            logger.error(f"Error updating job {job_id}: {str(e)}", exc_info=True)
            return False
    
    async def get_jobs(self) -> List[Dict[str, Any]]:
        """Get all jobs asynchronously"""
        logger.info("Retrieving all jobs")
        
        query = """
            SELECT id, name, type, status, progress, 
                start_time, end_time, user_id as user, 
                event_log_path, application_name,
                output_format, additional_options, output_path
            FROM jobs
            ORDER BY start_time DESC
        """
        
        try:
            jobs = await self.execute_query(query, fetch=True)
            
            # Convert datetime objects to ISO format strings
            for job in jobs:
                if job.get('start_time'):
                    job['start_time'] = job['start_time'].isoformat()
                if job.get('end_time'):
                    job['end_time'] = job['end_time'].isoformat()
                    
            logger.info(f"Retrieved {len(jobs)} jobs")
            return jobs
        except Exception as e:
            logger.error(f"Error fetching jobs: {str(e)}", exc_info=True)
            return []
    
    async def get_job(self, job_id: int) -> Optional[Dict[str, Any]]:
        """Get a job by ID asynchronously"""
        logger.info(f"Retrieving job with ID: {job_id}")
        
        query = """
            SELECT id, name, type, status, progress, 
                start_time, end_time, user_id as user, 
                event_log_path, application_name,
                output_format, additional_options, output_path, results
            FROM jobs
            WHERE id = $1
        """
        
        try:
            jobs = await self.execute_query(query, (job_id,), fetch=True)
            
            if not jobs:
                logger.warning(f"Job with ID {job_id} not found")
                return None
                
            job = jobs[0]
            
            # Convert datetime objects to ISO format strings
            if job.get('start_time'):
                job['start_time'] = job['start_time'].isoformat()
            if job.get('end_time'):
                job['end_time'] = job['end_time'].isoformat()
                
            return job
        except Exception as e:
            logger.error(f"Error fetching job {job_id}: {str(e)}", exc_info=True)
            return None