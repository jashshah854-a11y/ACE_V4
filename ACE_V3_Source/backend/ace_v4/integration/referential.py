from typing import List
import pandas as pd

from .models import RelationshipEdge, IntegrationIssue


class ReferentialIntegrityChecker:
    def __init__(self, orphan_threshold: float = 0.01, sample_limit: int = 20):
        """
        orphan_threshold is the fraction of child rows without a parent
        above which we raise an issue
        """
        self.orphan_threshold = orphan_threshold
        self.sample_limit = sample_limit

    def check_edge(
        self,
        edge: RelationshipEdge,
        tables: dict
    ) -> List[IntegrationIssue]:
        """
        tables: dict[str, pd.DataFrame]
        returns a list with zero or one IntegrationIssue for this edge
        """
        parent_df: pd.DataFrame = tables.get(edge.parent_table)
        child_df: pd.DataFrame = tables.get(edge.child_table)

        issues: List[IntegrationIssue] = []

        if parent_df is None or child_df is None:
            # cannot check if one table is missing
            return issues

        if edge.parent_key not in parent_df.columns:
            return issues

        if edge.child_key not in child_df.columns:
            return issues

        parent_keys = set(parent_df[edge.parent_key].dropna().astype(str))
        child_keys = child_df[edge.child_key].dropna().astype(str)

        total_child = len(child_keys)
        if total_child == 0:
            # no child rows means no referential problem on this edge
            return issues

        mask_orphan = ~child_keys.isin(parent_keys)
        orphan_keys_series = child_keys[mask_orphan]

        num_orphans = orphan_keys_series.shape[0]
        orphan_rate = num_orphans / total_child

        # update edge metadata if you store it
        edge.join_coverage = 1.0 - orphan_rate

        if orphan_rate <= self.orphan_threshold:
            return issues

        # choose severity based on rate
        if orphan_rate > 0.2:
            severity = "high"
        elif orphan_rate > 0.05:
            severity = "medium"
        else:
            severity = "low"

        sample_keys = list(orphan_keys_series.head(self.sample_limit).unique())

        issue = IntegrationIssue(
            issue_type="referential_integrity",
            severity=severity,
            description=(
                f"{num_orphans} of {total_child} child rows in "
                f"{edge.child_table} have no matching parent in {edge.parent_table} "
                f"on key {edge.child_key} to {edge.parent_key}. "
                f"Orphan rate {orphan_rate:.3f}"
            ),
            tables_involved=[edge.parent_table, edge.child_table],
            key_column=edge.child_key,
            metric=orphan_rate,
            sample_keys=sample_keys,
            context={
                "total_child_rows": total_child,
                "num_orphans": num_orphans,
                "parent_key": edge.parent_key,
                "child_key": edge.child_key,
                "parent_table": edge.parent_table,
                "child_table": edge.child_table,
                "orphan_rate": orphan_rate,
                "sample_key_example": str(sample_keys[0]) if sample_keys else "N/A"
            },
        )

        issues.append(issue)
        return issues

    def run(
        self,
        tables: dict,
        relationships: List[RelationshipEdge]
    ) -> List[IntegrationIssue]:
        """
        tables: dict[str, DataFrame]
        relationships: list of RelationshipEdge
        """
        all_issues: List[IntegrationIssue] = []
        for edge in relationships:
            issues = self.check_edge(edge, tables)
            all_issues.extend(issues)
        return all_issues
