import pandas as pd
from typing import List, Dict, Any, Optional
from pathlib import Path
from .aggregator import IntelligentAggregator
from .validator import IntakeValidator

class IntakeFusion:
    def __init__(self, run_path: str):
        self.run_path = Path(run_path)
        self.aggregator = IntelligentAggregator()
        self.validator = IntakeValidator()

    def fuse(self, tables: List[Dict[str, Any]], relationships: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Select primary table and fuse data into a master dataset using recursive graph logic.
        """
        primary_table = self._select_primary(tables)
        if not primary_table:
            return {"error": "No primary table found"}
            
        print(f"Selected Primary Table: {primary_table['name']} ({primary_table['type']})")
        
        # Load Primary
        master_df = pd.read_csv(primary_table["path"])
        original_rows = len(master_df)
        
        # If primary is a FACT table, aggregate it first
        if primary_table["type"] == "transaction_fact":
            master_df = self._aggregate_fact_to_entity(master_df, primary_table)
            primary_table["grain"] = "derived_entity"

        # Build Graph: Parent -> [Children]
        graph = {t["name"]: [] for t in tables}
        for rel in relationships:
            graph[rel["parent"]].append(rel)
            
        # Recursive Fusion
        # We start from Primary and fuse all attached children, and their children...
        # Actually, we want to fuse "upwards" or "inwards".
        # If Primary is Customer, and we have Orders (Child), and Orders have Items (Child of Child).
        # We should fuse Items -> Orders, then Orders -> Customer.
        
        # Simplified approach:
        # 1. Find all descendants of Primary.
        # 2. Sort by depth (deepest first).
        # 3. Fuse.
        
        # For now, let's just handle direct children and their children (2 levels)
        # Or better, iterative fusion.
        
        fused_tables = set([primary_table["name"]])
        
        # Find direct children of primary
        children = [r for r in relationships if r["parent"] == primary_table["name"]]
        
        for rel in children:
            child_name = rel["child"]
            child_table = next((t for t in tables if t["name"] == child_name), None)
            if not child_table: continue
            
            # Check if this child has its own children (Grandchildren of Primary)
            grandchildren = [r for r in relationships if r["parent"] == child_name]
            
            child_df = pd.read_csv(child_table["path"])
            
            # Fuse grandchildren into child first
            for g_rel in grandchildren:
                grandchild_name = g_rel["child"]
                grandchild_table = next((t for t in tables if t["name"] == grandchild_name), None)
                if grandchild_table:
                    # Load grandchild
                    grandchild_df = pd.read_csv(grandchild_table["path"])
                    
                    # Fuse parents of grandchild (Lookups like Products -> OrderItems)
                    grandchild_parents = [r for r in relationships if r["child"] == grandchild_name]
                    for gp_rel in grandchild_parents:
                        gp_name = gp_rel["parent"]
                        # Skip if parent is the Child (Orders) - avoiding cycle/redundancy
                        if gp_name == child_name: continue
                        
                        gp_table = next((t for t in tables if t["name"] == gp_name), None)
                        if gp_table:
                            grandchild_df = self._join_parent(grandchild_df, gp_table, gp_rel["child_key"], gp_rel["parent_key"])

                    # Fuse enriched grandchild into child
                    child_df = self._fuse_child(child_df, grandchild_table, g_rel["parent_key"], g_rel["child_key"], pre_loaded_df=grandchild_df)
            
            # Fuse parents of child (Lookups like Products -> OrderItems)
            child_parents = [r for r in relationships if r["child"] == child_name]
            for p_rel in child_parents:
                parent_name = p_rel["parent"]
                # Skip if parent is the Primary (already handled) or the Child's Parent (Orders)
                if parent_name == primary_table["name"]: continue
                
                parent_table = next((t for t in tables if t["name"] == parent_name), None)
                if parent_table:
                    # Join parent into child (Lookup)
                    child_df = self._join_parent(child_df, parent_table, p_rel["child_key"], p_rel["parent_key"])
            
            # Now fuse enriched child into master
            master_df = self._fuse_child(master_df, child_table, rel["parent_key"], rel["child_key"], pre_loaded_df=child_df)
            fused_tables.add(child_name)

        # Handle Parents (Lookup)
        # If Primary has a Parent (e.g. Transactions -> Customer), join attributes
        parents = [r for r in relationships if r["child"] == primary_table["name"]]
        for rel in parents:
            parent_name = rel["parent"]
            parent_table = next((t for t in tables if t["name"] == parent_name), None)
            if parent_table:
                master_df = self._join_parent(master_df, parent_table, rel["child_key"], rel["parent_key"])
                fused_tables.add(parent_name)

        # Validation
        # Find the primary key column (heuristic or from metadata if available)
        # For customer dimension, it's likely the first column or one with "id"
        pk = next((c for c in master_df.columns if "id" in c.lower()), master_df.columns[0])

        # Row explosion guard
        growth_ratio = (len(master_df) / max(1, original_rows)) if original_rows else 0
        if growth_ratio > 15:
            return {
                "error": f"Fusion aborted due to row explosion (growth x{growth_ratio:.2f})",
                "fusion_status": "blocked",
                "growth_ratio": growth_ratio,
            }
        
        val_report = self.validator.validate_fusion(
            pd.read_csv(primary_table["path"]) if primary_table["type"] != "transaction_fact" else master_df, 
            master_df,
            pk 
        )

        # Key health checks
        dup_rate = 0.0
        null_rate = 0.0
        if pk in master_df.columns:
            null_rate = master_df[pk].isna().mean()
            dup_rate = 1 - (master_df[pk].nunique(dropna=True) / max(1, len(master_df)))
        val_report["key_health"] = {
            "primary_key": pk,
            "null_rate": round(null_rate, 4),
            "dup_rate": round(dup_rate, 4),
        }
        if dup_rate > 0.2:
            val_report.setdefault("warnings", []).append("High duplicate rate on primary key post-fusion.")
        if null_rate > 0.05:
            val_report.setdefault("warnings", []).append("Primary key has significant nulls post-fusion.")
        
        # Save Master
        master_path = self.run_path / "master_dataset.csv"
        master_df.to_csv(master_path, index=False)
        
        return {
            "primary_table": primary_table["name"],
            "master_dataset_path": str(master_path),
            "rows": len(master_df),
            "columns": len(master_df.columns),
            "validation": val_report,
            "fusion_status": "ok",
            "growth_ratio": growth_ratio,
        }

    def _select_primary(self, tables: List[Dict[str, Any]]) -> Dict[str, Any]:
        # Priority 1: Customer Dimension
        for t in tables:
            if t["type"] == "customer_dimension": return t
        # Priority 2: Transaction Fact
        for t in tables:
            if t["type"] == "transaction_fact": return t
        # Priority 3: Any Dimension
        for t in tables:
            if "dimension" in t["type"]: return t
        # Fallback
        if tables: return max(tables, key=lambda x: x["row_count"])
        return None

    def _aggregate_fact_to_entity(self, df: pd.DataFrame, table_meta: Dict[str, Any]) -> pd.DataFrame:
        candidates = [c for c in df.columns if "id" in c.lower() or "code" in c.lower()]
        if not candidates: return df 
        entity_id = candidates[0]
        
        agg_rules = self.aggregator.get_rules(df, entity_id)
        grouped = df.groupby(entity_id).agg(agg_rules)
        grouped.columns = [f"{c[0]}_{c[1]}" if isinstance(c, tuple) else c for c in grouped.columns]
        grouped = grouped.reset_index()
        return grouped

    def _fuse_child(self, master_df: pd.DataFrame, child_table: Dict[str, Any], parent_key: str, child_key: str, pre_loaded_df: pd.DataFrame = None) -> pd.DataFrame:
        try:
            child_df = pre_loaded_df if pre_loaded_df is not None else pd.read_csv(child_table["path"])
            print(f"Fusing child {child_table['name']} on {parent_key}={child_key}...")
            
            agg_rules = self.aggregator.get_rules(child_df, child_key)
            
            grouped = child_df.groupby(child_key).agg(agg_rules)
            grouped.columns = [f"{child_table['name']}_{c[0]}_{c[1]}" if isinstance(c, tuple) else f"{child_table['name']}_{c}" for c in grouped.columns]
            grouped = grouped.reset_index()
            
            # Rename grouping key back to match parent key for join
            grouped = grouped.rename(columns={child_key: parent_key})
            
            return pd.merge(master_df, grouped, on=parent_key, how="left")
        except Exception as e:
            print(f"Fusion failed for {child_table['name']}: {e}")
            return master_df

    def _join_parent(self, master_df: pd.DataFrame, parent_table: Dict[str, Any], child_key: str, parent_key: str) -> pd.DataFrame:
        try:
            parent_df = pd.read_csv(parent_table["path"])
            print(f"Joining parent {parent_table['name']} on {child_key}={parent_key}...")
            
            cols_to_use = [c for c in parent_df.columns if c != parent_key]
            parent_subset = parent_df[[parent_key] + cols_to_use]
            
            rename_map = {c: f"{parent_table['name']}_{c}" for c in cols_to_use}
            rename_map[parent_key] = child_key # Align keys
            
            parent_subset = parent_subset.rename(columns=rename_map)
            
            return pd.merge(master_df, parent_subset, on=child_key, how="left")
        except Exception as e:
            print(f"Join failed for {parent_table['name']}: {e}")
            return master_df
