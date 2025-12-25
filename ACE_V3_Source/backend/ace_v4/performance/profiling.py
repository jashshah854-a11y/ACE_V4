import time
from contextlib import contextmanager
from typing import List


@contextmanager
def timed(label: str, logs: List[str]):
    start = time.time()
    yield
    end = time.time()
    duration = end - start
    logs.append(f"{label} took {duration:.3f} seconds")
