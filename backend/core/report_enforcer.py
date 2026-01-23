"""
Report Enforcer - ACE V4 Ghost Report Prevention
=================================================

LAW 1: The Ghost Report Fix
The pipeline SHALL NOT complete without a physical final_report.md on disk.

This module provides absolute enforcement using:
- Pathlib absolute path resolution
- Blocking verification with polling

Author: ACE V4 Stability Team
Phase: Operation Iron Heart
"""

import os
import time
from pathlib import Path
from datetime import datetime
from typing import Optional


# Maximum time to wait for report generation (seconds)
MAX_WAIT_SECONDS = 30

# Minimum acceptable report size (bytes)
MIN_REPORT_SIZE = 100

# Polling interval for file existence checks (seconds)
POLL_INTERVAL = 1.0


def enforce_report_existence(run_path: str, max_wait: int = MAX_WAIT_SECONDS) -> bool:
    """
    ABSOLUTE ENFORCEMENT: Verify that final_report.md physically exists.
    
    This function will:
    1. Resolve absolute path to final_report.md
    2. Poll for file existence up to max_wait seconds
    3. Verify file size is above minimum threshold
    4. Fail hard if still missing
    
    The pipeline CANNOT complete without this returning True.
    
    Args:
        run_path: Path to the run directory
        max_wait: Maximum seconds to wait for report (default: 30)
        
    Returns:
        bool: True if report exists and is valid, False otherwise
        
    Side Effects:
        - Logs enforcement actions
    """
    # Use absolute path resolution to prevent path traversal issues
    run_path_abs = Path(run_path).resolve()
    report_path = run_path_abs / "final_report.md"
    
    print(f"[REPORT_ENFORCER] Absolute path: {report_path}")
    print(f"[REPORT_ENFORCER] Waiting up to {max_wait}s for report generation...")
    
    start_time = time.time()
    
    # Poll for file existence
    for attempt in range(max_wait):
        elapsed = time.time() - start_time
        
        if report_path.exists():
            file_size = report_path.stat().st_size
            
            if file_size >= MIN_REPORT_SIZE:
                print(f"[REPORT_ENFORCER] Report verified: {file_size} bytes (elapsed: {elapsed:.1f}s)")
                return True
            else:
                print(f"[REPORT_ENFORCER] WARNING: Report too small: {file_size} bytes (min: {MIN_REPORT_SIZE})")
        
        # Still waiting...
        if attempt % 5 == 0 and attempt > 0:
            print(f"[REPORT_ENFORCER] Still waiting... ({attempt}s elapsed)")
        
        time.sleep(POLL_INTERVAL)
    
    # Max wait exceeded - fail hard
    print(f"[REPORT_ENFORCER] Report not found after {max_wait}s")
    return False


def verify_report_quality(report_path: Path) -> tuple[bool, Optional[str]]:
    """
    Verify that a report meets minimum quality standards.
    
    Checks:
    - File exists
    - File size above minimum threshold
    - File is readable
    - Contains expected markdown headers
    
    Args:
        report_path: Absolute path to report file
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not report_path.exists():
        return False, "Report file does not exist"
    
    try:
        file_size = report_path.stat().st_size
        if file_size < MIN_REPORT_SIZE:
            return False, f"Report too small: {file_size} bytes (min: {MIN_REPORT_SIZE})"
        
        # Read first few lines to check for markdown headers
        with open(report_path, 'r', encoding='utf-8') as f:
            first_lines = f.read(500)
            
        if not first_lines.strip():
            return False, "Report is empty"
        
        # Look for markdown header
        if not ('#' in first_lines or 'Analysis' in first_lines or 'Report' in first_lines):
            return False, "Report does not appear to contain valid content"
        
        return True, None
        
    except Exception as e:
        return False, f"Error reading report: {str(e)}"


# Export public API
__all__ = [
    "enforce_report_existence",
    "verify_report_quality",
    "MAX_WAIT_SECONDS",
    "MIN_REPORT_SIZE"
]
