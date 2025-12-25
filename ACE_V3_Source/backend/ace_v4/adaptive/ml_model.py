import numpy as np
import pandas as pd


class MLModel:
    def __init__(self, percentile_cut=0.003):
        self.percentile_cut = percentile_cut
        self.lower = 0.0
        self.upper = 0.0
        self.values = np.array([])

    def fit(self, series: pd.Series):
        clean = pd.to_numeric(series, errors="coerce").dropna().sort_values()
        if clean.empty:
            return
            
        self.values = clean.values
        self.lower = np.percentile(self.values, 100 * self.percentile_cut)
        self.upper = np.percentile(self.values, 100 * (1 - self.percentile_cut))

    def is_anomaly(self, value):
        if value < self.lower or value > self.upper:
            return True
        return False
