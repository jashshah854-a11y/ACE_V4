import pandas as pd
import os
import sys
from pathlib import Path
from typing import Iterator

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from ace_v4.performance.io import ChunkedCSVReader
from ace_v4.performance.config import PerformanceConfig

def test_io_small_file():
    # Create small CSV
    df = pd.DataFrame({"a": [1, 2, 3], "b": [4, 5, 6]})
    df.to_csv("test_small.csv", index=False)
    
    reader = ChunkedCSVReader()
    result = reader.read_auto("test_small.csv")
    
    assert isinstance(result, pd.DataFrame)
    assert len(result) == 3
    
    os.remove("test_small.csv")
    print("✅ test_io_small_file passed")

def test_io_large_file_simulation():
    # Create a CSV that we will treat as "large" by lowering threshold
    df = pd.DataFrame({"a": range(100), "b": range(100)})
    df.to_csv("test_large.csv", index=False)
    
    # Config to force chunking
    config = PerformanceConfig(large_file_size_mb=0.000001, chunk_size=20)
    reader = ChunkedCSVReader(config)
    
    result = reader.read_auto("test_large.csv")
    
    # Should be an iterator
    assert not isinstance(result, pd.DataFrame)
    assert isinstance(result, Iterator)
    
    chunks = list(result)
    assert len(chunks) == 5 # 100 rows / 20 chunksize = 5 chunks
    assert len(chunks[0]) == 20
    
    os.remove("test_large.csv")
    print("✅ test_io_large_file_simulation passed")

if __name__ == "__main__":
    test_io_small_file()
    test_io_large_file_simulation()
