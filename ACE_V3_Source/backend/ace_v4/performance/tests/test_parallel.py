import pandas as pd
import sys
from pathlib import Path
import time

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from ace_v4.performance.parallel import ParallelRunner
from ace_v4.performance.config import PerformanceConfig

def test_parallel_execution():
    tables = {
        "t1": pd.DataFrame({"a": [1]}),
        "t2": pd.DataFrame({"a": [2]}),
        "t3": pd.DataFrame({"a": [3]})
    }
    
    def task(name, df):
        # Simulate work
        time.sleep(0.1)
        return f"{name}:{len(df)}"
        
    runner = ParallelRunner()
    results = runner.run_per_table(tables, task)
    
    assert len(results) == 3
    assert results["t1"] == "t1:1"
    assert results["t2"] == "t2:1"
    assert results["t3"] == "t3:1"
    print("✅ test_parallel_execution passed")

def test_parallel_exception_handling():
    tables = {
        "t1": pd.DataFrame({"a": [1]}),
        "t2": pd.DataFrame({"a": [2]})
    }
    
    def task(name, df):
        if name == "t2":
            raise ValueError("Boom")
        return "ok"
        
    runner = ParallelRunner()
    results = runner.run_per_table(tables, task)
    
    assert results["t1"] == "ok"
    assert isinstance(results["t2"], ValueError)
    print("✅ test_parallel_exception_handling passed")

if __name__ == "__main__":
    test_parallel_execution()
    test_parallel_exception_handling()
