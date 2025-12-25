import pandas as pd
from typing import List, Dict, Any
from .models import IntegrationIssue, RelationshipEdge, TableNode

class IntegrationChecks:
    
    def check_referential_integrity(self, parent_df: pd.DataFrame, child_df: pd.DataFrame, edge: RelationshipEdge) -> List[IntegrationIssue]:
        issues = []
        
        # Check orphans
        if edge.child_key not in child_df.columns or edge.parent_key not in parent_df.columns:
            return issues
            
        child_keys = child_df[edge.child_key].dropna()
        parent_keys = set(parent_df[edge.parent_key].dropna())
        
        orphans = child_keys[~child_keys.isin(parent_keys)]
        orphan_count = len(orphans)
        total_children = len(child_keys)
        
        if total_children > 0 and orphan_count > 0:
            orphan_rate = orphan_count / total_children
            if orphan_rate > 0.0: # Strict check
                severity = "high" if orphan_rate > 0.1 else "medium"
                issues.append(IntegrationIssue(
                    issue_type="referential_integrity",
                    severity=severity,
                    main_table=edge.child_table,
                    related_table=edge.parent_table,
                    key_column=edge.child_key,
                    metric=orphan_rate,
                    description=f"{orphan_count} ({orphan_rate:.1%}) rows in {edge.child_table} have no parent in {edge.parent_table}",
                    sample_keys=orphans.head(5).tolist()
                ))
                
        return issues

    def check_duplicate_keys(self, df: pd.DataFrame, table: TableNode) -> List[IntegrationIssue]:
        issues = []
        if table.role == "dimension":
            for key in table.key_columns:
                if key in df.columns:
                    dupes = df[df.duplicated(subset=[key], keep=False)]
                    if not dupes.empty:
                        dupe_rate = len(dupes) / len(df)
                        issues.append(IntegrationIssue(
                            issue_type="duplicate_key",
                            severity="high",
                            main_table=table.name,
                            related_table=None,
                            key_column=key,
                            metric=dupe_rate,
                            description=f"Dimension {table.name} has duplicate keys in {key}",
                            sample_keys=dupes[key].head(5).tolist()
                        ))
        return issues

    def check_summary_consistency(self, summary_df: pd.DataFrame, fact_df: pd.DataFrame, summary_table: TableNode, fact_table: TableNode) -> List[IntegrationIssue]:
        issues = []
        # Heuristic: Compare total numeric sums
        # This is tricky without knowing exact aggregation logic.
        # Let's try to find common numeric columns.
        
        common_cols = set(summary_df.columns).intersection(set(fact_df.columns))
        numeric_cols = [c for c in common_cols if pd.api.types.is_numeric_dtype(summary_df[c]) and pd.api.types.is_numeric_dtype(fact_df[c])]
        
        for col in numeric_cols:
            summary_total = summary_df[col].sum()
            fact_total = fact_df[col].sum()
            
            if fact_total == 0: continue
            
            diff_pct = abs(summary_total - fact_total) / fact_total
            
            if diff_pct > 0.05: # 5% tolerance
                issues.append(IntegrationIssue(
                    issue_type="summary_mismatch",
                    severity="medium",
                    main_table=summary_table.name,
                    related_table=fact_table.name,
                    key_column=col,
                    metric=diff_pct,
                    description=f"Summary total for {col} ({summary_total}) differs from fact total ({fact_total}) by {diff_pct:.1%}",
                    context={"summary_total": summary_total, "fact_total": fact_total}
                ))
                
        return issues
