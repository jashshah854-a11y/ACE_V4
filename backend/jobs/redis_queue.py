"""
Redis-based job queue for multi-service coordination on Railway.

Replaces SQLite queue to enable proper sharing between web and worker services.
"""

import redis
import json
import uuid
import os
from typing import Optional
from datetime import datetime, timezone
from .models import Job, JobStatus


class RedisJobQueue:
    """
    Redis-based job queue for ACE analysis pipeline.
    
    Uses Redis lists for queue and hashes for job state storage.
    Designed for Railway multi-service architecture.
    """
    
    def __init__(self, redis_url: Optional[str] = None):
        """
        Initialize Redis connection.
        
        Args:
            redis_url: Redis connection URL (defaults to REDIS_URL env var)
        """
        url = redis_url or os.getenv("REDIS_URL")
        
        if not url:
            raise ValueError(
                "REDIS_URL environment variable not set. "
                "Please configure Redis service in Railway and link it to this service."
            )
        
        print(f"[RedisQueue] Connecting to Redis...")
        
        try:
            self.redis = redis.from_url(url, decode_responses=True, socket_connect_timeout=5)
        except Exception as e:
            print(f"[RedisQueue] Failed to create Redis client: {e}")
            raise
        
        # Redis keys
        self.queue_key = "ace:jobs:queue"
        self.state_key = "ace:jobs:state"
        
        # Test connection
        try:
            self.redis.ping()
            print(f"[RedisQueue] Connected to Redis successfully")
        except redis.ConnectionError as e:
            print(f"[RedisQueue] Failed to connect to Redis: {e}")
            print(f"[RedisQueue] Redis URL: {url[:20]}...")  # Print first 20 chars for debugging
            raise
        except Exception as e:
            print(f"[RedisQueue] Unexpected error during Redis ping: {e}")
            raise
    
    def enqueue(self, file_path: str, run_config: Optional[dict] = None) -> str:
        """
        Create and enqueue a new job.
        
        Args:
            file_path: Path to uploaded file
            run_config: Optional run configuration
            
        Returns:
            Job ID (run_id)
        """
        job_id = str(uuid.uuid4())[:8]
        now = datetime.now(timezone.utc).isoformat()
        
        job_data = {
            "run_id": job_id,
            "file_path": file_path,
            "status": JobStatus.QUEUED.value,  # Use QUEUED which exists in the enum
            "created_at": now,
            "updated_at": now,
            "run_config": run_config or {},
            "message": None,
            "run_path": None
        }
        
        # Add to queue (FIFO using LPUSH/BRPOP)
        self.redis.lpush(self.queue_key, json.dumps(job_data))
        
        # Store in state hash for quick lookup
        self.redis.hset(self.state_key, job_id, json.dumps(job_data))
        
        print(f"[RedisQueue] Enqueued job {job_id}")
        return job_id
    
    def fetch_next(self, timeout: int = 5) -> Optional[Job]:
        """
        Fetch next job from queue (blocking).
        
        Args:
            timeout: Seconds to wait for job (0 = wait forever)
            
        Returns:
            Job object or None if timeout
        """
        result = self.redis.brpop(self.queue_key, timeout=timeout)
        if not result:
            return None
        
        _, job_json = result
        job_dict = json.loads(job_json)
        
        print(f"[RedisQueue] Fetched job {job_dict['run_id']}")
        return Job(**job_dict)
    
    def update_status(
        self, 
        run_id: str, 
        status: JobStatus, 
        message: Optional[str] = None,
        run_path: Optional[str] = None
    ):
        """
        Update job status in Redis.
        
        Args:
            run_id: Job ID
            status: New status
            message: Optional status message
            run_path: Optional run path (for completed jobs)
        """
        job_json = self.redis.hget(self.state_key, run_id)
        if not job_json:
            print(f"[RedisQueue] Job {run_id} not found in state")
            return
        
        job_data = json.loads(job_json)
        job_data["status"] = status.value
        job_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        if message:
            job_data["message"] = message
        if run_path:
            job_data["run_path"] = run_path
        
        self.redis.hset(self.state_key, run_id, json.dumps(job_data))
        print(f"[RedisQueue] Updated job {run_id} status to {status.value}")
    
    def get_job(self, run_id: str) -> Optional[Job]:
        """
        Get job by ID.
        
        Args:
            run_id: Job ID
            
        Returns:
            Job object or None if not found
        """
        job_json = self.redis.hget(self.state_key, run_id)
        if not job_json:
            return None
        
        job_dict = json.loads(job_json)
        return Job(**job_dict)
    
    def get_all_jobs(self) -> list[Job]:
        """
        Get all jobs from state.
        
        Returns:
            List of Job objects
        """
        all_jobs = self.redis.hgetall(self.state_key)
        return [Job(**json.loads(job_json)) for job_json in all_jobs.values()]
    
    def delete_job(self, run_id: str):
        """
        Delete job from state.
        
        Args:
            run_id: Job ID
        """
        self.redis.hdel(self.state_key, run_id)
        print(f"[RedisQueue] Deleted job {run_id}")
    
    def get_queue_length(self) -> int:
        """
        Get number of jobs waiting in queue.
        
        Returns:
            Queue length
        """
        return self.redis.llen(self.queue_key)
    
    def clear_queue(self):
        """Clear all jobs from queue (for testing)."""
        self.redis.delete(self.queue_key)
        print(f"[RedisQueue] Cleared queue")
    
    def clear_state(self):
        """Clear all job state (for testing)."""
        self.redis.delete(self.state_key)
        print(f"[RedisQueue] Cleared state")


# Singleton instance
_queue_instance = None

def get_queue() -> RedisJobQueue:
    """Get or create singleton queue instance."""
    global _queue_instance
    if _queue_instance is None:
        _queue_instance = RedisJobQueue()
    return _queue_instance
