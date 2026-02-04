"""Performance profiling utilities for ACE V4 pipeline.

Provides timing decorators, memory tracking, and performance report generation.
"""
from __future__ import annotations

import functools
import time
import traceback
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional
import threading

# Thread-local storage for nested timing contexts
_local = threading.local()


@dataclass
class TimingEntry:
    """Single timing measurement."""
    name: str
    start_time: float
    end_time: float = 0.0
    duration_seconds: float = 0.0
    success: bool = True
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def finish(self, success: bool = True, error: Optional[str] = None):
        self.end_time = time.time()
        self.duration_seconds = round(self.end_time - self.start_time, 4)
        self.success = success
        self.error = error


@dataclass
class PerformanceReport:
    """Aggregated performance report for a run."""
    run_id: str
    total_duration_seconds: float = 0.0
    step_timings: Dict[str, TimingEntry] = field(default_factory=dict)
    memory_samples: List[Dict[str, Any]] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to JSON-serializable dict."""
        step_summary = {}
        for name, entry in self.step_timings.items():
            step_summary[name] = {
                "duration_seconds": entry.duration_seconds,
                "success": entry.success,
                "error": entry.error,
                "metadata": entry.metadata,
            }

        # Calculate percentages
        if self.total_duration_seconds > 0:
            for name, data in step_summary.items():
                data["percentage"] = round(
                    data["duration_seconds"] / self.total_duration_seconds * 100, 1
                )

        # Find bottlenecks
        bottlenecks = sorted(
            step_summary.items(),
            key=lambda x: x[1]["duration_seconds"],
            reverse=True,
        )[:5]

        return {
            "run_id": self.run_id,
            "total_duration_seconds": self.total_duration_seconds,
            "step_count": len(self.step_timings),
            "steps": step_summary,
            "bottlenecks": [
                {"step": name, **data} for name, data in bottlenecks
            ],
            "memory_samples": self.memory_samples[-10:],  # Last 10 samples
            "warnings": self.warnings,
            "success_rate": round(
                sum(1 for e in self.step_timings.values() if e.success)
                / max(len(self.step_timings), 1)
                * 100,
                1,
            ),
        }


class PerformanceProfiler:
    """Tracks performance metrics across pipeline execution."""

    def __init__(self, run_id: str):
        self.run_id = run_id
        self.report = PerformanceReport(run_id=run_id)
        self._start_time = time.time()
        self._lock = threading.Lock()

    def start_step(self, step_name: str, **metadata) -> TimingEntry:
        """Start timing a step."""
        entry = TimingEntry(
            name=step_name,
            start_time=time.time(),
            metadata=metadata,
        )
        with self._lock:
            self.report.step_timings[step_name] = entry
        return entry

    def finish_step(
        self,
        step_name: str,
        success: bool = True,
        error: Optional[str] = None,
        **extra_metadata,
    ):
        """Finish timing a step."""
        with self._lock:
            entry = self.report.step_timings.get(step_name)
            if entry:
                entry.finish(success=success, error=error)
                entry.metadata.update(extra_metadata)

    def record_memory(self, label: str = ""):
        """Record current memory usage."""
        try:
            import psutil
            process = psutil.Process()
            mem_info = process.memory_info()
            sample = {
                "timestamp": time.time(),
                "label": label,
                "rss_mb": round(mem_info.rss / 1024 / 1024, 2),
                "vms_mb": round(mem_info.vms / 1024 / 1024, 2),
            }
            with self._lock:
                self.report.memory_samples.append(sample)
        except ImportError:
            pass  # psutil not available
        except Exception:
            pass  # Ignore memory tracking errors

    def add_warning(self, message: str):
        """Add a performance warning."""
        with self._lock:
            self.report.warnings.append(message)

    def finalize(self) -> PerformanceReport:
        """Finalize and return the performance report."""
        self.report.total_duration_seconds = round(
            time.time() - self._start_time, 2
        )

        # Check for slow steps (> 30% of total time)
        for name, entry in self.report.step_timings.items():
            if self.report.total_duration_seconds > 0:
                pct = entry.duration_seconds / self.report.total_duration_seconds
                if pct > 0.3:
                    self.add_warning(
                        f"Step '{name}' took {pct:.0%} of total runtime ({entry.duration_seconds:.1f}s)"
                    )

        return self.report


# Global profiler registry (per run_id)
_profilers: Dict[str, PerformanceProfiler] = {}
_profilers_lock = threading.Lock()


def get_profiler(run_id: str) -> PerformanceProfiler:
    """Get or create a profiler for a run."""
    with _profilers_lock:
        if run_id not in _profilers:
            _profilers[run_id] = PerformanceProfiler(run_id)
        return _profilers[run_id]


def clear_profiler(run_id: str):
    """Clear profiler for a run."""
    with _profilers_lock:
        _profilers.pop(run_id, None)


@contextmanager
def timed_step(step_name: str, run_id: Optional[str] = None, **metadata):
    """Context manager for timing a step.

    Usage:
        with timed_step("my_step", run_id="abc123"):
            # code to time
    """
    profiler = get_profiler(run_id) if run_id else None
    entry = profiler.start_step(step_name, **metadata) if profiler else None

    start = time.time()
    error_msg = None
    success = True

    try:
        yield entry
    except Exception as e:
        success = False
        error_msg = str(e)
        raise
    finally:
        duration = time.time() - start
        if profiler and entry:
            profiler.finish_step(step_name, success=success, error=error_msg)

        # Also store in thread-local for nested access
        if not hasattr(_local, "timings"):
            _local.timings = []
        _local.timings.append({
            "step": step_name,
            "duration": round(duration, 4),
            "success": success,
        })


def timed(label: str = ""):
    """Decorator for timing function execution.

    Usage:
        @timed("process_data")
        def process_data(df):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            name = label or func.__name__
            start = time.time()
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start
                # Log if slow (> 5 seconds)
                if duration > 5:
                    print(f"[PERF] {name} took {duration:.2f}s")
                return result
            except Exception:
                duration = time.time() - start
                print(f"[PERF] {name} failed after {duration:.2f}s")
                raise

        return wrapper
    return decorator


def profile_function(func: Callable) -> Callable:
    """Decorator that profiles function with timing and optional memory tracking.

    Usage:
        @profile_function
        def expensive_operation():
            ...
    """
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        func_name = func.__name__

        # Try to get memory before
        mem_before = None
        try:
            import psutil
            mem_before = psutil.Process().memory_info().rss
        except:
            pass

        start = time.time()
        try:
            result = func(*args, **kwargs)
            success = True
            error = None
        except Exception as e:
            success = False
            error = str(e)
            raise
        finally:
            duration = time.time() - start

            # Memory after
            mem_delta = None
            try:
                import psutil
                if mem_before is not None:
                    mem_after = psutil.Process().memory_info().rss
                    mem_delta = (mem_after - mem_before) / 1024 / 1024  # MB
            except:
                pass

            # Log profile info
            profile_info = {
                "function": func_name,
                "duration_seconds": round(duration, 4),
                "success": success,
            }
            if mem_delta is not None:
                profile_info["memory_delta_mb"] = round(mem_delta, 2)
            if error:
                profile_info["error"] = error

            # Store in thread-local
            if not hasattr(_local, "profiles"):
                _local.profiles = []
            _local.profiles.append(profile_info)

        return result

    return wrapper


def get_thread_timings() -> List[Dict[str, Any]]:
    """Get all timings recorded in this thread."""
    return getattr(_local, "timings", [])


def get_thread_profiles() -> List[Dict[str, Any]]:
    """Get all function profiles recorded in this thread."""
    return getattr(_local, "profiles", [])


def clear_thread_metrics():
    """Clear thread-local metrics."""
    _local.timings = []
    _local.profiles = []


def generate_performance_summary(run_id: str) -> Dict[str, Any]:
    """Generate a performance summary for a run.

    This aggregates all timing data from the profiler.
    """
    with _profilers_lock:
        profiler = _profilers.get(run_id)
        if not profiler:
            return {"run_id": run_id, "error": "No profiler found for this run"}

        report = profiler.finalize()
        return report.to_dict()


def estimate_remaining_time(
    completed_steps: List[str],
    total_steps: List[str],
    step_timings: Dict[str, float],
) -> Optional[float]:
    """Estimate remaining pipeline time based on historical step durations.

    Args:
        completed_steps: List of completed step names
        total_steps: Full list of step names in order
        step_timings: Historical average durations per step

    Returns:
        Estimated seconds remaining, or None if can't estimate
    """
    remaining_steps = [s for s in total_steps if s not in completed_steps]

    if not remaining_steps:
        return 0.0

    # Sum estimated durations for remaining steps
    estimated = sum(step_timings.get(s, 60.0) for s in remaining_steps)
    return round(estimated, 1)
