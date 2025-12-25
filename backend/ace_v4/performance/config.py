from dataclasses import dataclass


@dataclass
class PerformanceConfig:
    # IO thresholds
    large_file_size_mb: int = 100
    large_row_count: int = 1_000_000

    # CSV read options
    chunk_size: int = 100_000
    sample_rows_for_type_inference: int = 10_000

    # For agents: max rows to sample for analysis (prevents memory exhaustion)
    max_analysis_rows: int = 100_000

    # Parallel execution
    max_workers: int = 4

    # Safety
    memory_soft_limit_mb: int = 4_000

    # Timeout calculation
    base_timeout_seconds: int = 600
    timeout_per_mb: int = 5
