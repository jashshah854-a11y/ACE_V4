"""
Simulation Engine - What-If Analysis
Enables prescriptive analytics by simulating parameter changes

CONSTRAINT: All simulations are ephemeral (RAM only) - never modify original data
"""
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Any, Optional
import logging
import json

logger = logging.getLogger(__name__)


MAX_SIMULATION_ROWS = 100000  # Cap simulation size for memory safety

class SimulationEngine:
    """
    Handles ephemeral dataset modifications and delta calculations
    IRON DOME: Enforces memory limits to prevent OOM
    """
    
    def __init__(self, run_id: str):
        self.run_id = run_id
        self.run_path = Path(f"data/runs/{run_id}")
        
    def load_dataset(self) -> pd.DataFrame:
        """
        Load original dataset from run
        IRON DOME: Downsamples large datasets to prevent OOM
        """
        data_path = self.run_path / "processed_data.parquet"
        if not data_path.exists():
            raise FileNotFoundError(f"Dataset not found for run {self.run_id}")
        
        logger.info(f"[SIMULATION] Loading dataset from {data_path}")
        
        try:
            # Read metadata first without loading full file (if possible)
            # For robustness, we'll read and check length immediately
            df = pd.read_parquet(data_path)
            
            # DOWN-SAMPLE if too large
            if len(df) > MAX_SIMULATION_ROWS:
                logger.warning(f"[IRON DOME] Dataset too large ({len(df)} rows). Downsampling to {MAX_SIMULATION_ROWS} for simulation.")
                df = df.sample(n=MAX_SIMULATION_ROWS, random_state=42)
            
            return df
            
        except MemoryError:
            logger.critical("[IRON DOME] MemoryError during dataset load. Attempting emergency downsample.")
            # Emergency fallback: Read chunks or fail gracefully
            raise ValueError("Dataset too large for simulation memory limits")
        except Exception as e:
            logger.error(f"[SIMULATION] Load error: {e}")
            raise
    
    def load_original_analytics(self) -> Dict[str, Any]:
        """Load original analytics results"""
        analytics_path = self.run_path / "enhanced_analytics.json"
        if not analytics_path.exists():
            raise FileNotFoundError(f"Analytics not found for run {self.run_id}")
        
        with open(analytics_path, 'r') as f:
            return json.load(f)
    
    def apply_modifications(
        self,
        df: pd.DataFrame,
        modifications: list[dict]
    ) -> pd.DataFrame:
        """
        Apply multiple modifications sequentially
        
        Args:
            df: Original dataframe
            modifications: List of dicts with 'target_column' and 'modification_factor'
            
        Returns:
            Modified copy of dataframe
        """
        try:
            df_sim = df.copy()  # Ephemeral copy
        except MemoryError:
            logger.critical("[IRON DOME] MemoryError during simulation copy. Dataset too large.")
            raise ValueError("System memory limit reached during simulation. Please reduce dataset size.")

        for mod in modifications:
            target_column = mod['target_column']
            factor = mod['modification_factor']
            
            if target_column not in df_sim.columns:
                raise ValueError(f"Column '{target_column}' not found in dataset")
            
            # Verify column is numeric
            if not pd.api.types.is_numeric_dtype(df_sim[target_column]):
                raise ValueError(f"Column '{target_column}' is not numeric")
            
            # Apply modification
            logger.info(f"[SIMULATION] Modifying {target_column} by factor {factor}")
            df_sim[target_column] = df_sim[target_column] * factor
            
        return df_sim

    def apply_modification(
        self, 
        df: pd.DataFrame, 
        target_column: str, 
        modification_factor: float
    ) -> pd.DataFrame:
        """Legacy single-modification wrapper"""
        return self.apply_modifications(df, [{
            'target_column': target_column, 
            'modification_factor': modification_factor
        }])

    
    def calculate_delta(
        self,
        original_metrics: Dict[str, Any],
        simulated_metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculate delta between original and simulated metrics
        
        Returns:
            Dictionary with delta calculations for each metric
        """
        delta = {}
        
        # Churn risk delta
        if 'churn_risk' in original_metrics and 'churn_risk' in simulated_metrics:
            orig_pct = original_metrics['churn_risk'].get('at_risk_percentage', 0)
            sim_pct = simulated_metrics['churn_risk'].get('at_risk_percentage', 0)
            delta_value = sim_pct - orig_pct
            
            delta['churn_risk'] = {
                'original': round(orig_pct, 2),
                'simulated': round(sim_pct, 2),
                'delta': round(delta_value, 2),
                'delta_direction': 'increase' if delta_value > 0 else 'decrease',
                'delta_percentage': round((delta_value / orig_pct * 100) if orig_pct > 0 else 0, 1)
            }
        
        # Ghost revenue delta
        if 'ghost_revenue' in original_metrics and 'ghost_revenue' in simulated_metrics:
            orig_count = original_metrics['ghost_revenue'].get('ghost_user_count', 0)
            sim_count = simulated_metrics['ghost_revenue'].get('ghost_user_count', 0)
            
            delta['ghost_revenue'] = {
                'original': orig_count,
                'simulated': sim_count,
                'delta': sim_count - orig_count
            }
        
        # Zombie cohorts delta
        if 'zombie_cohorts' in original_metrics and 'zombie_cohorts' in simulated_metrics:
            orig_count = original_metrics['zombie_cohorts'].get('zombie_count', 0)
            sim_count = simulated_metrics['zombie_cohorts'].get('zombie_count', 0)
            
            delta['zombie_cohorts'] = {
                'original': orig_count,
                'simulated': sim_count,
                'delta': sim_count - orig_count
            }
        
        return delta
