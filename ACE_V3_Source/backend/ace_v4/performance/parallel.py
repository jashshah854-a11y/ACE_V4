from typing import Callable, Any, Dict, List, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed

from .config import PerformanceConfig


class ParallelRunner:
    def __init__(self, config: PerformanceConfig = None):
        self.config = config or PerformanceConfig()

    def run_per_table(
        self,
        tables: Dict[str, Any],
        func: Callable[[str, Any], Any]
    ) -> Dict[str, Any]:
        """
        Run a function for each table in parallel.

        func receives (table_name, table_df) and returns any result.
        """

        results: Dict[str, Any] = {}

        with ThreadPoolExecutor(max_workers=self.config.max_workers) as executor:
            future_map: List[Tuple] = []

            for name, df in tables.items():
                future = executor.submit(func, name, df)
                future_map.append((name, future))

            for name, future in future_map:
                try:
                    results[name] = future.result()
                except Exception as e:
                    # collect errors but do not stop other tasks
                    results[name] = e

        return results
