from dataclasses import dataclass


@dataclass
class PerformanceConfig:
    # IO thresholds
    large_file_size_mb: int = 100
    large_row_count: int = 1_000_000

    # CSV read options
    chunk_size: int = 100_000
    sample_rows_for_type_inference: int = 10_000

    # Parallel execution
    max_workers: int = 4

    # Safety
    memory_soft_limit_mb: int = 4_000
