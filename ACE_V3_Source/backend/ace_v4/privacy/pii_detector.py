import re
from typing import List, Dict
import pandas as pd

EMAIL_RE = re.compile(r".+@.+\..+")
PHONE_RE = re.compile(r"\+?\d[\d\-\s]{7,}")
CREDIT_RE = re.compile(r"\b\d{13,19}\b")
ADDRESS_HINTS = ["street", "avenue", "city", "state", "country", "zip"]
NAME_HINTS = ["first_name", "last_name", "full_name", "fname", "lname"]


class PIIDetector:
    def detect_columns(self, df: pd.DataFrame) -> Dict[str, str]:
        """
        Return mapping column_name -> pii_type or empty mapping.
        """
        hits = {}

        for col in df.columns:
            cname = str(col).lower()

            # column name based detection
            if any(h in cname for h in NAME_HINTS):
                hits[col] = "name"
                continue
            if any(h in cname for h in ADDRESS_HINTS):
                hits[col] = "address"
                continue
            if "email" in cname:
                hits[col] = "email"
                continue
            if "phone" in cname or "mobile" in cname:
                hits[col] = "phone"
                continue

            # content based detection
            # Sample non-null values
            sample = df[col].dropna().astype(str).head(50)
            if sample.empty:
                continue

            if any(EMAIL_RE.match(x) for x in sample):
                hits[col] = "email"
                continue
            if any(PHONE_RE.match(x) for x in sample):
                hits[col] = "phone"
                continue
            if any(CREDIT_RE.match(x) for x in sample):
                hits[col] = "credit_card"
                continue

        return hits
