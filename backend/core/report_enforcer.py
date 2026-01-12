"""
Report Enforcer - ACE V4 Ghost Report Prevention
=================================================

LAW 1: The Ghost Report Fix
The pipeline SHALL NOT complete without a physical final_report.md on disk.

This module provides absolute enforcement using:
- Pathlib absolute path resolution
- Blocking verification with polling
- Forced fallback generation if agent fails

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
    4. Force-generate fallback if still missing
    
    The pipeline CANNOT complete without this returning True.
    
    Args:
        run_path: Path to the run directory
        max_wait: Maximum seconds to wait for report (default: 30)
        
    Returns:
        bool: True if report exists and is valid, False otherwise
        
    Side Effects:
        - May create fallback report if original doesn't exist
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
                print(f"[REPORT_ENFORCER] ✓ Report verified: {file_size} bytes (elapsed: {elapsed:.1f}s)")
                return True
            else:
                print(f"[REPORT_ENFORCER] ⚠️ Report too small: {file_size} bytes (min: {MIN_REPORT_SIZE})")
        
        # Still waiting...
        if attempt % 5 == 0 and attempt > 0:
            print(f"[REPORT_ENFORCER] Still waiting... ({attempt}s elapsed)")
        
        time.sleep(POLL_INTERVAL)
    
    # Max wait exceeded - force generation
    print(f"[REPORT_ENFORCER] ❌ Report not found after {max_wait}s")
    print(f"[REPORT_ENFORCER] Forcing fallback generation...")
    
    success = force_generate_fallback_report(report_path, run_path_abs)
    
    if success:
        print(f"[REPORT_ENFORCER] ✓ Fallback report created")
        return True
    else:
        print(f"[REPORT_ENFORCER] ❌ CRITICAL: Fallback generation failed")
        return False


def force_generate_fallback_report(report_path: Path, run_path: Path) -> bool:
    """
    Generate a minimal fallback report when the expositor agent fails.
    
    This is the LAST RESORT. If we get here, something went wrong with
    the expositor agent, but we still need to close the pipeline cleanly.
    
    Args:
        report_path: Absolute path where report should be written
        run_path: Absolute path to run directory
        
    Returns:
        bool: True if fallback was successfully written
    """
    try:
        # Try to load identity card for context
        identity_card_path = run_path / "artifacts" / "dataset_identity_card.json"
        quality_score = 0.0
        row_count = 0
        col_count = 0
        
        if identity_card_path.exists():
            import json
            with open(identity_card_path, 'r', encoding='utf-8') as f:
                identity = json.load(f)
                quality_score = identity.get("quality_score", 0.0)
                row_count = identity.get("row_count", 0)
                col_count = identity.get("column_count", 0)
        
        # Try to load orchestrator state for status info
        state_path = run_path / "orchestrator_state.json"
        failed_steps = []
        completed_steps = []
        
        if state_path.exists():
            import json
            with open(state_path, 'r', encoding='utf-8') as f:
                state = json.load(f)
                failed_steps = state.get("failed_steps", [])
                completed_steps = state.get("steps_completed", [])
        
        # Generate fallback report
        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        
        fallback_content = f"""# Analysis Report (System Fallback)

**Status:** Failed - Emergency Report  
**Generated:** {timestamp}  
**Confidence Score:** 0.1  
**Data Quality Score:** {quality_score:.2f}  
**Mode:** Diagnostic

---

## System Notice: Critical Failure

The ACE analysis pipeline could not generate a standard report due to an internal processing error.

### Dataset Summary

- **Rows:** {row_count:,}
- **Columns:** {col_count}
- **Quality Score:** {quality_score:.2f}

### Pipeline Status

**Completed Steps:** {len(completed_steps)}  
**Failed Steps:** {len(failed_steps)}

**Completed:**
{chr(10).join(f"- {step}" for step in completed_steps) if completed_steps else "- None"}

**Failed:**
{chr(10).join(f"- {step}" for step in failed_steps) if failed_steps else "- None"}

---

## Diagnostics

**Component:** Expositor Agent  
**Status:** Failed to execute or timed out  
**Error:** Report generation did not complete within allocated time

### Recommended Actions

1. **Check Data Quality:** Quality score of {quality_score:.2f} may indicate data issues
2. **Review Failed Steps:** Investigate why {len(failed_steps)} step(s) failed
3. **Retry Analysis:** Try re-uploading with a cleaner dataset
4. **Contact Support:** If issue persists, this may indicate a system problem

---

## Technical Details

**Run Directory:** `{run_path.name}`  
**Report Type:** Emergency Fallback  
**Generation Method:** Automated failsafe

This report was generated automatically by the ACE V4 Report Enforcer module
because the standard report generation process did not complete successfully.

For detailed logs, check the orchestrator state and individual agent artifacts.

---

**ACE V4 Intelligence Engine**  
*Stability Law 1: No Ghost Reports*
"""
        
        # Write fallback report
        report_path.parent.mkdir(parents=True, exist_ok=True)
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(fallback_content)
            
        # ------------------------------------------------------------------
        # V4 STABILITY PATCH: Ensure Analytics State Exists
        # If we fallback, the API needs 'enhanced_analytics' to not 404.
        # ------------------------------------------------------------------
        try:
             # Lazy import to avoid circular dependencies at top level
            from core.state_manager import StateManager
            
            # Initialize StateManager (detects REDIS_URL from env automatically)
            state = StateManager(str(run_path))
            
            # Write Safe Mode / Empty Analytics
            state.write("enhanced_analytics", {
                "quality_metrics": {"available": False, "reason": "Timeout Fallback"},
                "business_intelligence": {"available": False},
                "feature_importance": {"available": False},
                "correlations": {"available": False},
                "fallback_mode": "timeout"
            })
            print(f"[REPORT_ENFORCER] ✓ Fallback analytics verified in state/Redis")
        except Exception as state_err:
            print(f"[REPORT_ENFORCER] ⚠️ Could not write fallback analytics: {state_err}")
        # ------------------------------------------------------------------
        
        # Verify it was written
        if report_path.exists() and report_path.stat().st_size >= MIN_REPORT_SIZE:
            return True
        else:
            return False
            
    except Exception as e:
        print(f"[REPORT_ENFORCER] ❌ Exception in fallback generation: {e}")
        
        # ULTRA FALLBACK - write minimal text
        try:
            minimal_content = f"""# Analysis Failed

The ACE analysis pipeline encountered a critical error and could not generate a report.

**Timestamp:** {datetime.utcnow().isoformat()}Z  
**Run Path:** {run_path}

Please check system logs for details.
"""
            with open(report_path, 'w', encoding='utf-8') as f:
                f.write(minimal_content)
            
            return report_path.exists()
        except Exception as e2:
            print(f"[REPORT_ENFORCER] ❌ CRITICAL: Even minimal fallback failed: {e2}")
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
    "force_generate_fallback_report",
    "verify_report_quality",
    "MAX_WAIT_SECONDS",
    "MIN_REPORT_SIZE"
]
