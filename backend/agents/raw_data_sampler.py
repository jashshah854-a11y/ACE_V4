"""
Raw Data Sampler Agent - Provides actual data rows for LLM context.

This agent samples strategic rows from the dataset to give LLMs
access to actual data patterns, not just statistics. This enables:

1. Seeing actual outlier examples (the "$199.99 game with 0 reviews")
2. Examining anomaly records in context
3. Understanding what extreme values actually look like
4. Connecting specific entities to patterns

Without this, LLMs only see "skewness = 33.92" instead of
"Publisher Hede has 50 games all priced at $199.99 with 0 reviews"
"""

import json
import sys
from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.state_manager import StateManager
from core.data_loader import smart_load_dataset
from ace_v4.performance.config import PerformanceConfig
from utils.logging import log_launch, log_ok, log_warn, log_info


class RawDataSampler:
    """Sample strategic rows from dataset for LLM interpretation context."""
    
    def __init__(self, state: StateManager):
        self.state = state
        self.name = "RawDataSampler"
        self.df = None
        
    def run(self) -> Dict[str, Any]:
        """Generate strategic samples from the dataset."""
        log_launch(f"Agent {self.name}")
        
        # Load the dataset
        if not self._load_data():
            return {"status": "error", "reason": "Could not load dataset"}
        
        # Get profile for context
        profile = self.state.read("data_profile") or {}
        columns = profile.get("columns", {})
        
        # Get anomaly indices if available
        anomalies = self.state.read("anomalies") or {}
        anomaly_indices = anomalies.get("anomaly_indices", [])
        
        samples = {}
        
        # 1. Sample extremes for numeric columns
        log_info("Sampling extreme values...")
        samples["extremes"] = self._sample_all_extremes(columns)
        
        # 2. Sample anomaly rows
        log_info("Sampling anomaly records...")
        samples["anomalies"] = self._sample_anomalies(anomaly_indices)
        
        # 3. Sample by categorical frequency (rare categories)
        log_info("Sampling rare categories...")
        samples["rare_categories"] = self._sample_rare_categories(columns)
        
        # 4. Sample outliers (z-score > 3)
        log_info("Sampling statistical outliers...")
        samples["outliers"] = self._sample_outliers(columns)
        
        # 5. Sample "interesting" combinations
        log_info("Sampling interesting patterns...")
        samples["interesting_patterns"] = self._sample_interesting_patterns(columns)
        
        # 6. Sample zero/null patterns
        log_info("Sampling zero patterns...")
        samples["zero_patterns"] = self._sample_zero_patterns(columns)
        
        # Build summary
        result = {
            "status": "success",
            "sample_counts": {k: len(v) if isinstance(v, list) else len(v.get("rows", [])) for k, v in samples.items()},
            "samples": samples,
        }
        
        # Save to state
        self.state.write("raw_samples", result)
        
        log_ok(f"Sampled {sum(result['sample_counts'].values())} strategic rows")
        return result
    
    def _load_data(self) -> bool:
        """Load the dataset."""
        try:
            active_dataset = self.state.read("active_dataset") or {}
            dataset_path = active_dataset.get("path")
            
            if not dataset_path or not Path(dataset_path).exists():
                log_warn("Dataset not found")
                return False
            
            config = PerformanceConfig()
            self.df = smart_load_dataset(
                dataset_path,
                config=config,
                fast_mode=True,
                prefer_parquet=True,
            )
            return True
        except Exception as e:
            log_warn(f"Failed to load dataset: {e}")
            return False
    
    def _sample_all_extremes(self, columns: dict, n: int = 3) -> Dict[str, List[Dict]]:
        """Sample top and bottom N rows for each numeric column."""
        extremes = {}
        
        for col_name, col_info in columns.items():
            if col_name not in self.df.columns:
                continue
            
            col_type = col_info.get("inferred_type", "")
            if col_type not in ["numeric", "integer", "float"]:
                continue
            
            try:
                col = self.df[col_name].dropna()
                if len(col) == 0:
                    continue
                
                # Get top N
                top_idx = col.nlargest(n).index.tolist()
                top_rows = self.df.loc[top_idx].head(n).to_dict(orient="records")
                
                # Get bottom N
                bottom_idx = col.nsmallest(n).index.tolist()
                bottom_rows = self.df.loc[bottom_idx].head(n).to_dict(orient="records")
                
                extremes[col_name] = {
                    "highest": self._sanitize_rows(top_rows),
                    "lowest": self._sanitize_rows(bottom_rows),
                }
            except Exception as e:
                log_warn(f"Could not sample extremes for {col_name}: {e}")
        
        return extremes
    
    def _sample_anomalies(self, anomaly_indices: List[int], n: int = 10) -> List[Dict]:
        """Sample actual anomaly rows."""
        if not anomaly_indices:
            return []
        
        try:
            # Take a sample of anomaly indices
            sample_indices = anomaly_indices[:n]
            valid_indices = [i for i in sample_indices if i < len(self.df)]
            
            if not valid_indices:
                return []
            
            rows = self.df.iloc[valid_indices].to_dict(orient="records")
            return self._sanitize_rows(rows)
        except Exception as e:
            log_warn(f"Could not sample anomalies: {e}")
            return []
    
    def _sample_rare_categories(self, columns: dict, n: int = 5) -> Dict[str, List[Dict]]:
        """Sample rows with rare category values."""
        rare = {}
        
        for col_name, col_info in columns.items():
            if col_name not in self.df.columns:
                continue
            
            col_type = col_info.get("inferred_type", "")
            if col_type not in ["categorical", "string", "object"]:
                continue
            
            try:
                # Find rare values (bottom 5% frequency)
                value_counts = self.df[col_name].value_counts()
                if len(value_counts) < 10:
                    continue
                
                threshold = value_counts.quantile(0.05)
                rare_values = value_counts[value_counts <= max(threshold, 2)].head(n).index.tolist()
                
                if not rare_values:
                    continue
                
                # Get rows with these rare values
                mask = self.df[col_name].isin(rare_values)
                rows = self.df[mask].head(n).to_dict(orient="records")
                
                rare[col_name] = {
                    "rare_values": rare_values,
                    "rows": self._sanitize_rows(rows),
                }
            except Exception as e:
                log_warn(f"Could not sample rare categories for {col_name}: {e}")
        
        return rare
    
    def _sample_outliers(self, columns: dict, z_threshold: float = 3.0, n: int = 5) -> Dict[str, List[Dict]]:
        """Sample rows with z-score > threshold."""
        outliers = {}
        
        for col_name, col_info in columns.items():
            if col_name not in self.df.columns:
                continue
            
            col_type = col_info.get("inferred_type", "")
            if col_type not in ["numeric", "integer", "float"]:
                continue
            
            try:
                col = self.df[col_name].dropna()
                if len(col) < 10:
                    continue
                
                mean = col.mean()
                std = col.std()
                
                if std == 0:
                    continue
                
                z_scores = (col - mean) / std
                outlier_mask = abs(z_scores) > z_threshold
                
                if outlier_mask.sum() == 0:
                    continue
                
                outlier_indices = col[outlier_mask].index[:n].tolist()
                rows = self.df.loc[outlier_indices].to_dict(orient="records")
                
                outliers[col_name] = {
                    "z_threshold": z_threshold,
                    "outlier_count": int(outlier_mask.sum()),
                    "rows": self._sanitize_rows(rows),
                }
            except Exception as e:
                log_warn(f"Could not sample outliers for {col_name}: {e}")
        
        return outliers
    
    def _sample_interesting_patterns(self, columns: dict, n: int = 10) -> List[Dict]:
        """Sample rows with potentially interesting combinations."""
        patterns = []
        
        # Find numeric columns
        numeric_cols = [
            col for col, info in columns.items()
            if info.get("inferred_type") in ["numeric", "integer", "float"]
            and col in self.df.columns
        ]
        
        # Find categorical columns likely to be entities (publisher, developer, etc.)
        entity_cols = [
            col for col in self.df.columns
            if any(keyword in col.lower() for keyword in ["publisher", "developer", "vendor", "seller", "author", "creator", "company"])
        ]
        
        try:
            # Pattern: High volume + extreme values
            if entity_cols and numeric_cols:
                for entity_col in entity_cols[:2]:
                    for num_col in numeric_cols[:3]:
                        # Group by entity, find those with high count AND extreme values
                        grouped = self.df.groupby(entity_col)[num_col].agg(["count", "mean", "max"])
                        
                        # High volume entities
                        high_volume = grouped[grouped["count"] > grouped["count"].quantile(0.95)]
                        
                        if len(high_volume) > 0:
                            # Get sample rows from these entities
                            top_entities = high_volume.head(3).index.tolist()
                            mask = self.df[entity_col].isin(top_entities)
                            rows = self.df[mask].head(n).to_dict(orient="records")
                            
                            patterns.append({
                                "type": "high_volume_entity",
                                "entity_column": entity_col,
                                "value_column": num_col,
                                "entities": top_entities,
                                "rows": self._sanitize_rows(rows),
                            })
        except Exception as e:
            log_warn(f"Could not sample interesting patterns: {e}")
        
        return patterns
    
    def _sample_zero_patterns(self, columns: dict, n: int = 10) -> Dict[str, Any]:
        """Sample rows where important columns have zero or null values."""
        zero_patterns = {}
        
        # Columns likely to indicate "invisible" or "failed" entities
        important_keywords = ["recommendation", "review", "rating", "score", "sales", "revenue", "views", "clicks"]
        
        for col_name in self.df.columns:
            col_lower = col_name.lower()
            
            # Check if this is an "important" column
            if not any(kw in col_lower for kw in important_keywords):
                continue
            
            try:
                col = self.df[col_name]
                
                # Count zeros and nulls
                zero_count = (col == 0).sum()
                null_count = col.isna().sum()
                
                total = len(col)
                zero_pct = zero_count / total * 100 if total > 0 else 0
                null_pct = null_count / total * 100 if total > 0 else 0
                
                if zero_pct > 20 or null_pct > 20:  # Significant zero pattern
                    # Sample rows with zero values
                    zero_mask = (col == 0) | col.isna()
                    rows = self.df[zero_mask].head(n).to_dict(orient="records")
                    
                    zero_patterns[col_name] = {
                        "zero_count": int(zero_count),
                        "zero_percentage": round(zero_pct, 2),
                        "null_count": int(null_count),
                        "null_percentage": round(null_pct, 2),
                        "rows": self._sanitize_rows(rows),
                        "insight": f"{zero_pct:.1f}% of records have zero {col_name}" if zero_pct > 50 else None,
                    }
            except Exception as e:
                log_warn(f"Could not analyze zero patterns for {col_name}: {e}")
        
        return zero_patterns
    
    def _sanitize_rows(self, rows: List[Dict]) -> List[Dict]:
        """Sanitize row values for JSON serialization."""
        sanitized = []
        for row in rows:
            clean_row = {}
            for k, v in row.items():
                if isinstance(v, (np.integer, np.floating)):
                    clean_row[k] = float(v) if np.isfinite(v) else None
                elif isinstance(v, np.bool_):
                    clean_row[k] = bool(v)
                elif isinstance(v, (list, dict)):
                    clean_row[k] = str(v)[:100]  # Truncate complex values
                elif v is None or (isinstance(v, float) and np.isnan(v)):
                    clean_row[k] = None
                else:
                    # Truncate long strings
                    str_val = str(v)
                    clean_row[k] = str_val[:200] if len(str_val) > 200 else str_val
            sanitized.append(clean_row)
        return sanitized


def main():
    """Command-line entry point."""
    if len(sys.argv) < 2:
        print("Usage: python raw_data_sampler.py <run_path>")
        sys.exit(1)
    
    run_path = sys.argv[1]
    state = StateManager(run_path)
    
    agent = RawDataSampler(state)
    try:
        result = agent.run()
        print(json.dumps(result, indent=2, default=str))
    except Exception as e:
        import traceback
        print(f"[ERROR] RawDataSampler agent failed: {e}")
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
