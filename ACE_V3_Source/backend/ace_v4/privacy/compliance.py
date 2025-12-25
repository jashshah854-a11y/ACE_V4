import pandas as pd
from .pii_detector import PIIDetector
from .masker import Masker


class ComplianceEngine:
    def __init__(self):
        self.detector = PIIDetector()
        self.masker = Masker()

    def secure_logs(self, df: pd.DataFrame) -> pd.DataFrame:
        # For logs, we might want to mask everything or just PII very aggressively
        # The user prompt says "mode log masks everything strong" in Masker.mask_dataframe logic
        # But here it says "pii = detector... mask(df, pii, mode='log')"
        # If mode='log' ignores pii_map and masks everything, then passing pii is fine but unused.
        pii = self.detector.detect_columns(df)
        return self.masker.mask_dataframe(df, pii, mode="log")

    def secure_export_safe(self, df: pd.DataFrame) -> pd.DataFrame:
        pii = self.detector.detect_columns(df)
        return self.masker.mask_dataframe(df, pii, mode="safe")

    def secure_export_full(self, df: pd.DataFrame) -> pd.DataFrame:
        pii = self.detector.detect_columns(df)
        return self.masker.mask_dataframe(df, pii, mode="full")
