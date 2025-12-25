import pandas as pd
import numpy as np

from .stats_model import StatsModel
from .ml_model import MLModel


class ModelSelector:
    def choose(self, series: pd.Series):
        clean = pd.to_numeric(series, errors="coerce").dropna()

        if len(clean) < 50:
            return StatsModel()

        std = float(clean.std())
        mean = float(clean.mean())

        if mean == 0:
            ratio = std
        else:
            ratio = std / abs(mean)

        # heavy tail  
        if clean.skew() > 2:
            return MLModel()

        # low volatility
        if ratio < 0.1:
            return StatsModel(hard_factor=2.0)

        # high volatility  
        if ratio > 1.0:
            return StatsModel(soft_factor=3.0, hard_factor=5.0)

        return StatsModel()
