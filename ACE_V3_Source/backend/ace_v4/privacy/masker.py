from typing import Dict, Any
import pandas as pd

class Masker:
    def mask_value(self, value: Any, pii_type: str) -> Any:
        if value is None:
            return None
        s = str(value)

        if pii_type == "email":
            parts = s.split("@")
            if len(parts) > 1:
                return "***@" + parts[-1]
            return "***"

        if pii_type == "phone":
            return "***" + s[-4:] if len(s) > 4 else "***"

        if pii_type == "credit_card":
            return "**** **** **** " + s[-4:] if len(s) > 4 else "****"

        if pii_type == "name":
            return s[0] + "***" if len(s) > 0 else "***"

        if pii_type == "address":
            return "***"

        return "***"

    def mask_dataframe(self, df: pd.DataFrame, pii_map: Dict[str, str], mode: str = "safe") -> pd.DataFrame:
        """
        mode safe masks all pii columns and logs.
        mode full masks pii only.
        mode log masks everything strong.
        """
        new_df = df.copy()

        if mode == "log":
            for col in new_df.columns:
                new_df[col] = new_df[col].apply(lambda x: "***")
            return new_df

        for col, pii_type in pii_map.items():
            if col in new_df.columns:
                new_df[col] = new_df[col].apply(lambda v: self.mask_value(v, pii_type))

        return new_df
