import pandas as pd
import numpy as np
from scipy.stats import skew
from pathlib import Path
import json
import warnings

def scan_dataset(file_path: str, sample_size: int = 5, corr_threshold: float = 0.4):
    """
    Scans a dataset and returns a compact summary for the Schema Interpreter.
    """
    # Load dataset
    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        return {"error": f"Failed to load dataset: {str(e)}"}

    result = {
        "dataset_info": {},
        "basic_types": {
            "numeric": [],
            "categorical": [],
            "datetime": [],
            "text": []
        },
        "stats": {},
        "relationships": {
            "correlations": {},
            "strong_pairs": []
        },
        "warnings": {
            "missing_numeric": False,
            "low_row_count": False,
            "suspected_data_issues": []
        }
    }

    # Dataset info
    result["dataset_info"] = {
        "name": Path(file_path).stem,
        "path": str(file_path),
        "row_count": df.shape[0],
        "column_count": df.shape[1],
        "sample_rows": df.head(sample_size).to_dict(orient="records")
    }

    # Detect column types
    for col in df.columns:
        # Try numeric
        try:
            # Check if it can be converted to numeric (ignoring NaNs)
            pd.to_numeric(df[col].dropna())
            # If successful, check if it's not actually boolean or categorical-like numbers if needed
            # For now, following the prompt's logic: if parses as numbers -> numeric
            result["basic_types"]["numeric"].append(col)
            continue
        except:
            pass

        # Try datetime
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore") 
                pd.to_datetime(df[col].dropna())
            result["basic_types"]["datetime"].append(col)
            continue
        except:
            pass

        # Categorical or text?
        if df[col].dtype == "object":
            if df[col].nunique() <= (df.shape[0] * 0.5):
                result["basic_types"]["categorical"].append(col)
            else:
                result["basic_types"]["text"].append(col)
        else:
            # Fallback for other types (bool, etc)
            result["basic_types"]["categorical"].append(col)

    # Numeric stats
    for col in result["basic_types"]["numeric"]:
        # Force conversion to ensure we handle mixed types that passed the try/except check
        series = pd.to_numeric(df[col], errors="coerce")
        
        # Skip if all NaNs
        if series.dropna().empty:
            continue
            
        result["stats"][col] = {
            "mean": float(series.mean()),
            "median": float(series.median()),
            "std": float(series.std()),
            "min": float(series.min()),
            "max": float(series.max()),
            "skew": float(skew(series.dropna())) if series.dropna().shape[0] > 1 else 0,
            "missing_rate": float(series.isna().mean())
        }

    # Correlations
    if len(result["basic_types"]["numeric"]) > 1:
        # Select only numeric columns for correlation
        numeric_df = df[result["basic_types"]["numeric"]].apply(pd.to_numeric, errors='coerce')
        corr_matrix = numeric_df.corr()

        for col in corr_matrix.columns:
            result["relationships"]["correlations"][col] = {}
            for col2 in corr_matrix.columns:
                if col == col2:
                    continue
                corr_val = corr_matrix.loc[col, col2]
                
                # Handle NaN correlations (constant columns)
                if pd.isna(corr_val):
                    continue
                    
                result["relationships"]["correlations"][col][col2] = float(corr_val)

                if abs(corr_val) >= corr_threshold:
                    result["relationships"]["strong_pairs"].append([col, col2])

    # Warnings
    if len(result["basic_types"]["numeric"]) == 0:
        result["warnings"]["missing_numeric"] = True

    if df.shape[0] < 50:
        result["warnings"]["low_row_count"] = True

    return result

def save_scan_output(scan_result, output_path="data/schema_scan_output.json"):
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(scan_result, f, indent=4)

if __name__ == "__main__":
    # Test with the banking data we prepared earlier
    test_file = "data/customer_data.csv" 
    if Path(test_file).exists():
        print(f"Scanning {test_file}...")
        scan = scan_dataset(test_file)
        save_scan_output(scan)
        print("Scan complete. Saved to data/schema_scan_output.json")
    else:
        print(f"Test file {test_file} not found.")
