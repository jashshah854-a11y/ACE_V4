from typing import List, Dict, Any
import pandas as pd

from .models import TableNode, RelationshipEdge, IntegrationIssue
from .referential import ReferentialIntegrityChecker
from .value_domains import ValueDomainChecker


class IntegrationEngine:
    def __init__(self, config: dict = None, schema_graph: Dict = None):
        """
        config can contain thresholds for orphan rate and such
        schema_graph can be whatever Intake 2.0 uses to describe relationships
        """
        self.config = config or {}
        self.schema_graph = schema_graph

        orphan_threshold = self.config.get("orphan_threshold", 0.01)
        self.ref_checker = ReferentialIntegrityChecker(
            orphan_threshold=orphan_threshold
        )
        
        self.value_domain_checker = ValueDomainChecker(
            max_unique=self.config.get("max_unique", 500)
        )

        # placeholders for other checkers
        self.summary_checker = None
        self.schema_conflict_checker = None

    def build_table_nodes(
        self,
        tables: Dict[str, "pd.DataFrame"],
        roles: Dict[str, str] = None,
        source_tags: Dict[str, str] = None
    ) -> List[TableNode]:
        """
        Derive TableNode instances from the loaded tables.
        roles and source_tags can be provided from Intake metadata.
        """
        roles = roles or {}
        source_tags = source_tags or {}

        nodes: List[TableNode] = []

        for name, df in tables.items():
            node = TableNode(
                name=name,
                role=roles.get(name, "unknown"),
                key_columns=[],  # can be filled from Intake metadata
                columns=list(df.columns),
                row_count=len(df),
                source_tag=source_tags.get(name)
            )
            nodes.append(node)

        return nodes

    def build_relationships(self) -> List[RelationshipEdge]:
        """
        For now this assumes schema_graph already holds relationship info.
        Anti Gravity should map their Intake relationship model to RelationshipEdge here.
        """
        relationships: List[RelationshipEdge] = []

        if not self.schema_graph:
            return relationships

        # Handle list of dicts (Intake 2.0 format) or dict with "relationships" key
        rels = []
        if isinstance(self.schema_graph, list):
            rels = self.schema_graph
        elif isinstance(self.schema_graph, dict):
            rels = self.schema_graph.get("relationships", [])
            
        for rel in rels:
            # Intake 2.0 format: {'parent': 'customers', 'child': 'orders', 'key': 'cust_id'}
            # Or user format: {'parent_table': ..., 'child_table': ...}
            
            parent = rel.get("parent_table", rel.get("parent"))
            child = rel.get("child_table", rel.get("child"))
            p_key = rel.get("parent_key", rel.get("key"))
            c_key = rel.get("child_key", rel.get("key"))
            
            if parent and child and p_key:
                edge = RelationshipEdge(
                    parent_table=parent,
                    child_table=child,
                    parent_key=p_key,
                    child_key=c_key or p_key, # Fallback if same key
                    cardinality_estimate=rel.get("cardinality", "one_to_many")
                )
                relationships.append(edge)

        return relationships

    def run(
        self,
        master_dataset
    ) -> List[IntegrationIssue]:
        """
        master_dataset is expected to expose per table frames
        for example master_dataset.tables is a dict[str, DataFrame]
        Anti Gravity can adjust this based on their implementation.
        """
        # Adapt to Intake 2.0 result dict
        tables = {}
        if isinstance(master_dataset, dict) and "tables" in master_dataset:
             # Load tables from paths if not already loaded
             for name, meta in master_dataset["tables"].items():
                 if "path" in meta:
                     try:
                         tables[name] = pd.read_csv(meta["path"])
                     except:
                         pass
        elif hasattr(master_dataset, "tables"):
            tables = master_dataset.tables
        else:
            # fallback if master_dataset itself is a single dataframe
            # But integration needs multiple tables.
            # If we only have master_dataset.df (fused), we can't check referential integrity of source tables easily.
            # We assume we have access to source tables.
            pass

        relationships = self.build_relationships()

        issues: List[IntegrationIssue] = []

        # 1 referential integrity
        if tables and relationships:
            ref_issues = self.ref_checker.run(tables, relationships)
            issues.extend(ref_issues)

        # 2 value domain consistency
        if tables:
            vd_issues = self.value_domain_checker.run(tables)
            issues.extend(vd_issues)

        # 3 summary vs detail checks
        # Simple heuristic: if we have a table with role 'summary' and one with 'fact',
        # and they share a numeric column, compare sums.
        
        # Identify summary and fact tables based on naming or metadata
        # For now, let's use the 'type' in metadata if available, or name
        summary_tables = []
        fact_tables = []
        
        if isinstance(master_dataset, dict) and "tables" in master_dataset:
            for name, meta in master_dataset["tables"].items():
                t_type = meta.get("type", "").lower()
                if "summary" in t_type or "summary" in name.lower():
                    summary_tables.append(name)
                elif "fact" in t_type or "fact" in name.lower() or "orders" in name.lower():
                    fact_tables.append(name)
                    
        for s_name in summary_tables:
            for f_name in fact_tables:
                if s_name == f_name: continue
                
                s_df = tables.get(s_name)
                f_df = tables.get(f_name)
                
                if s_df is None or f_df is None: continue
                
                # Find common numeric columns
                common_cols = set(s_df.select_dtypes(include='number').columns) & \
                              set(f_df.select_dtypes(include='number').columns)
                              
                for col in common_cols:
                    s_sum = s_df[col].sum()
                    f_sum = f_df[col].sum()
                    
                    # Allow small floating point difference
                    if abs(s_sum - f_sum) > 0.01:
                        issues.append(IntegrationIssue(
                            issue_type="summary_mismatch",
                            severity="medium",
                            description=f"Summary table '{s_name}' column '{col}' sum ({s_sum}) does not match fact table '{f_name}' sum ({f_sum})",
                            tables_involved=[s_name, f_name],
                            context={"column": col, "summary_sum": float(s_sum), "fact_sum": float(f_sum)}
                        ))

        # 4 schema conflict checks

        return issues
