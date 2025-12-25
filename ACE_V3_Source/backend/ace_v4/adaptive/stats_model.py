import numpy as np
import pandas as pd

class StatsModel:
    def __init__(self, soft_factor=1.5, hard_factor=3.0):
        self.soft_factor = soft_factor
        self.hard_factor = hard_factor
        self.median = 0.0
        self.iqr = 0.0
        self.mad = 0.0
        self.lower_soft = 0.0
        self.upper_soft = 0.0
        self.lower_hard = 0.0
        self.upper_hard = 0.0

    def fit(self, series: pd.Series):
        clean = pd.to_numeric(series, errors="coerce").dropna()
        if clean.empty:
            return

        self.median = float(clean.median())
        self.iqr = float(clean.quantile(0.75) - clean.quantile(0.25))
        self.mad = float(np.median(np.abs(clean - self.median)))

        # fallback when no IQR available
        if self.iqr == 0:
            self.iqr = self.mad or 1.0

        self.lower_soft = self.median - self.soft_factor * self.iqr
        self.upper_soft = self.median + self.soft_factor * self.iqr

        self.lower_hard = self.median - self.hard_factor * self.iqr
        self.upper_hard = self.median + self.hard_factor * self.iqr

    def score(self, value):
        if value < self.lower_hard or value > self.upper_hard:
            return "hard"
        if value < self.lower_soft or value > self.upper_soft:
            return "soft"
        return "normal"
