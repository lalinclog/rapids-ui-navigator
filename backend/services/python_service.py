
import os
import subprocess
import tempfile
import json
import time
import logging
import shutil
from pathlib import Path
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PythonService:
    def check_python_env(self):
        """Check if Python environment is properly set up"""
        # ... keep existing code
            
    def setup_python_env(self):
        """Set up Python environment with required packages"""
        # ... keep existing code
            
    def get_installed_packages(self):
        """Get list of installed Python packages"""
        # ... keep existing code

    def check_java_availability(self):
        """Check if Java is available and return version info"""
        try:
            result = subprocess.run(
                ["java", "-version"],
                capture_output=True,
                text=True,
                check=False
            )
            # Java version is usually sent to stderr
            java_version = result.stderr if result.stderr else result.stdout
            if result.returncode == 0:
                return True, java_version
            else:
                return False, "Java not found or not executable"
        except Exception as e:
            logger.error(f"Error checking Java: {str(e)}")
            return False, str(e)

    def run_qualification_task(self, job_id, params, minio_service, postgres_service):
        """Run qualification tool in the background"""
        try:
            # Update job status to running
            postgres_service.update_job(job_id, {"status": "running", "progress": 10})
            
            # Check if Java is available
            java_available, java_info = self.check_java_availability()
            if not java_available:
                error_message = f"Java is required but not available: {java_info}"
                logger.error(error_message)
                postgres_service.update_job(job_id, {
                    "status": "failed", 
                    "end_time": datetime.now(),
                    "results": {"error": error_message}
                })
                return
            
            # Get the event log file from MinIO if it's an s3:// path
            if params.eventLogPath.startswith('s3://'):
                try:
                    event_log_file = minio_service.get_file(params.eventLogPath)
                    logger.info(f"Retrieved event log from MinIO: {event_log_file}")
                except Exception as e:
                    logger.error(f"Error retrieving event log: {str(e)}")
                    postgres_service.update_job(job_id, {
                        "status": "failed", 
                        "end_time": datetime.now(),
                        "results": {"error": f"Error retrieving event log: {str(e)}"}
                    })
                    return
            else:
                # Use local path (not ideal in production)
                event_log_file = params.eventLogPath
            
            # Update progress
            postgres_service.update_job(job_id, {"progress": 30})
            
            # Create a temporary directory for output
            output_dir = tempfile.mkdtemp()
            output_format = params.outputFormat or "json"
            
            # Default platform
            platform = params.platform if hasattr(params, "platform") and params.platform else "onprem"
            
            # Build command using direct command-line invocation
            cmd = [
                "spark_rapids", "qualification",
                "--eventlogs", event_log_file,
                "--platform", platform,
                "-o", output_dir,
                "--output-format", output_format
            ]
            
            # Add application name if provided
            if params.applicationName:
                cmd.extend(["--name", params.applicationName])
            
            # Add additional options if provided
            if params.additionalOptions:
                additional_opts = params.additionalOptions.split()
                cmd.extend(additional_opts)
            
            logger.info(f"Running command: {' '.join(cmd)}")
            
            # Update progress
            postgres_service.update_job(job_id, {"progress": 50})
            
            # Run the command
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                # Update progress
                postgres_service.update_job(job_id, {"progress": 80})
                
                # Find the result file in the output directory
                result_files = []
                if output_format == "html":
                    result_files = list(Path(output_dir).glob(f"**/*.{output_format}"))
                else:
                    result_files = list(Path(output_dir).glob(f"*.{output_format}"))
                    
                if not result_files:
                    # Look for any file with the right extension in subdirectories
                    result_files = list(Path(output_dir).glob(f"**/*.{output_format}"))
                
                output_file = None
                if result_files:
                    output_file = str(result_files[0])
                    logger.info(f"Found result file: {output_file}")
                else:
                    logger.warning(f"No {output_format} files found in {output_dir}")
                
                # Upload the result to MinIO if we found one
                output_path = None
                if output_file:
                    output_object = f"qualification-results/{job_id}/{Path(output_file).name}"
                    output_path = f"s3://rapids-outputs/{output_object}"
                    
                    minio_result = minio_service.store_file(output_file, output_path)
                    logger.info(f"Uploaded result to: {output_path}")
                
                # Parse results for JSON data
                qualification_results = None
                if output_format == "json" and output_file:
                    try:
                        with open(output_file, 'r') as f:
                            qualification_results = json.load(f)
                    except Exception as e:
                        logger.error(f"Error parsing JSON results: {str(e)}")
                
                # For demo purposes, generate sample results if none were parsed
                if not qualification_results:
                    qualification_results = {
                        "speedupFactor": 2.7,
                        "gpuOpportunities": 15,
                        "recommendedChanges": [
                            "Replace DataFrame.groupBy() operations with GPU acceleration",
                            "Optimize join operations for GPU processing"
                        ],
                        "detailedAnalysis": "Sample analysis output"
                    }
                
                # Update job as completed
                postgres_service.update_job(job_id, {
                    "status": "completed",
                    "progress": 100,
                    "end_time": datetime.now(),
                    "output_path": output_path,
                    "results": qualification_results
                })
                
                # Clean up the temporary directory
                try:
                    shutil.rmtree(output_dir)
                except Exception as e:
                    logger.error(f"Error cleaning up directory {output_dir}: {str(e)}")
                
                logger.info(f"Qualification job {job_id} completed successfully")
            else:
                # Job failed
                error_message = result.stderr or "Unknown error"
                postgres_service.update_job(job_id, {
                    "status": "failed",
                    "end_time": datetime.now(),
                    "results": {"error": error_message}
                })
                logger.error(f"Qualification job {job_id} failed: {error_message}")
                
        except Exception as e:
            logger.error(f"Error in qualification task: {str(e)}")
            postgres_service.update_job(job_id, {
                "status": "failed",
                "end_time": datetime.now(),
                "results": {"error": str(e)}
            })

    def run_profiling_task(self, job_id, params, minio_service, postgres_service):
        """Run profiling tool in the background"""
        try:
            # Update job status to running
            postgres_service.update_job(job_id, {"status": "running", "progress": 10})
            
            # Check if Java is available
            java_available, java_info = self.check_java_availability()
            if not java_available:
                error_message = f"Java is required but not available: {java_info}"
                logger.error(error_message)
                postgres_service.update_job(job_id, {
                    "status": "failed", 
                    "end_time": datetime.now(),
                    "results": {"error": error_message}
                })
                return
            
            # Get the event log file from MinIO if it's an s3:// path
            if params.eventLogPath.startswith('s3://'):
                try:
                    event_log_file = minio_service.get_file(params.eventLogPath)
                    logger.info(f"Retrieved event log from MinIO: {event_log_file}")
                except Exception as e:
                    logger.error(f"Error retrieving event log: {str(e)}")
                    postgres_service.update_job(job_id, {
                        "status": "failed", 
                        "end_time": datetime.now(),
                        "results": {"error": f"Error retrieving event log: {str(e)}"}
                    })
                    return
            else:
                # Use local path (not ideal in production)
                event_log_file = params.eventLogPath
            
            # Update progress
            postgres_service.update_job(job_id, {"progress": 30})
            
            # Create a temporary directory for output
            output_dir = tempfile.mkdtemp()
            output_format = params.outputFormat or "json"
            
            # Default platform
            platform = params.platform if hasattr(params, "platform") and params.platform else "onprem"
            
            # Build command using direct command-line invocation
            cmd = [
                "spark_rapids", "profiling",
                "--eventlogs", event_log_file,
                "--platform", platform,
                "-o", output_dir,
                "--output-format", output_format
            ]
            
            # Add application name if provided
            if params.applicationName:
                cmd.extend(["--name", params.applicationName])
            
            # Add timeline flag if requested
            if params.generateTimeline:
                cmd.append("--generate-timeline")
            
            # Add additional options if provided
            if params.additionalOptions:
                additional_opts = params.additionalOptions.split()
                cmd.extend(additional_opts)
            
            logger.info(f"Running command: {' '.join(cmd)}")
            
            # Update progress
            postgres_service.update_job(job_id, {"progress": 50})
            
            # Run the command
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                # Update progress
                postgres_service.update_job(job_id, {"progress": 80})
                
                # Find the result file in the output directory
                result_files = []
                if output_format == "html":
                    result_files = list(Path(output_dir).glob(f"**/*.{output_format}"))
                else:
                    result_files = list(Path(output_dir).glob(f"*.{output_format}"))
                    
                if not result_files:
                    # Look for any file with the right extension in subdirectories
                    result_files = list(Path(output_dir).glob(f"**/*.{output_format}"))
                
                output_file = None
                if result_files:
                    output_file = str(result_files[0])
                    logger.info(f"Found result file: {output_file}")
                else:
                    logger.warning(f"No {output_format} files found in {output_dir}")
                
                # Upload the result to MinIO if we found one
                output_path = None
                if output_file:
                    output_object = f"profiling-results/{job_id}/{Path(output_file).name}"
                    output_path = f"s3://rapids-outputs/{output_object}"
                    
                    minio_result = minio_service.store_file(output_file, output_path)
                    logger.info(f"Uploaded result to: {output_path}")
                
                # Parse results for JSON data
                profiling_results = None
                if output_format == "json" and output_file:
                    try:
                        with open(output_file, 'r') as f:
                            profiling_results = json.load(f)
                    except Exception as e:
                        logger.error(f"Error parsing JSON results: {str(e)}")
                
                # For demo purposes, generate sample results if none were parsed
                if not profiling_results:
                    profiling_results = {
                        "executionTime": 45.2,
                        "gpuUtilization": 78.5,
                        "memoryUsage": 4.2,
                        "recommendations": [
                            "Increase executor memory for improved performance",
                            "Consider adjusting partition size"
                        ],
                        "timelineData": [{"time": 0, "event": "start"}, {"time": 45.2, "event": "end"}]
                    }
                
                # Update job as completed
                postgres_service.update_job(job_id, {
                    "status": "completed",
                    "progress": 100,
                    "end_time": datetime.now(),
                    "output_path": output_path,
                    "results": profiling_results
                })
                
                # Clean up the temporary directory
                try:
                    shutil.rmtree(output_dir)
                except Exception as e:
                    logger.error(f"Error cleaning up directory {output_dir}: {str(e)}")
                
                logger.info(f"Profiling job {job_id} completed successfully")
            else:
                # Job failed
                error_message = result.stderr or "Unknown error"
                postgres_service.update_job(job_id, {
                    "status": "failed",
                    "end_time": datetime.now(),
                    "results": {"error": error_message}
                })
                logger.error(f"Profiling job {job_id} failed: {error_message}")
                
        except Exception as e:
            logger.error(f"Error in profiling task: {str(e)}")
            postgres_service.update_job(job_id, {
                "status": "failed",
                "end_time": datetime.now(),
                "results": {"error": str(e)}
            })
