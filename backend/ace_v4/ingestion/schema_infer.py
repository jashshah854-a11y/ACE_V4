import pandas as pd


class SchemaInfer:
    def infer_schema(self, df: pd.DataFrame):
        schema = {}

        for col in df.columns:
            series = df[col].dropna()

            if series.empty:
                schema[col] = "string"
                continue

            if pd.api.types.is_numeric_dtype(series):
                schema[col] = "numeric"
            elif pd.api.types.is_bool_dtype(series):
                schema[col] = "boolean"
            elif pd.api.types.is_datetime64_any_dtype(series):
                schema[col] = "date"
            else:
                # try parse date
                try:
                    pd.to_datetime(series.iloc[0])
                    schema[col] = "date"
                except Exception:
                    schema[col] = "string"

        return schema
