from typing import List
from .models import DatasetSnapshot, ChangeRecord


class SnapshotDiffer:
    def compare(self, project_id: str, prev: DatasetSnapshot, curr: DatasetSnapshot) -> List[ChangeRecord]:
        changes: List[ChangeRecord] = []

        # schema differences
        prev_schema = prev.schema_signature
        curr_schema = curr.schema_signature

        all_tables = set(prev_schema.keys()) | set(curr_schema.keys())

        for table in sorted(all_tables):
            p = prev_schema.get(table, {})
            c = curr_schema.get(table, {})

            # added columns
            for col in c.keys() - p.keys():
                changes.append(ChangeRecord(
                    project_id=project_id,
                    snapshot_id=curr.snapshot_id,
                    previous_snapshot_id=prev.snapshot_id,
                    change_type="schema_added_column",
                    severity="medium",
                    description=f"Table {table} gained new column {col}",
                    context={"table": table, "column": col},
                ))

            # removed columns
            for col in p.keys() - c.keys():
                changes.append(ChangeRecord(
                    project_id=project_id,
                    snapshot_id=curr.snapshot_id,
                    previous_snapshot_id=prev.snapshot_id,
                    change_type="schema_removed_column",
                    severity="medium",
                    description=f"Table {table} lost column {col}",
                    context={"table": table, "column": col},
                ))

            # type changes
            for col in p.keys() & c.keys():
                if p[col] != c[col]:
                    changes.append(ChangeRecord(
                        project_id=project_id,
                        snapshot_id=curr.snapshot_id,
                        previous_snapshot_id=prev.snapshot_id,
                        change_type="schema_type_change",
                        severity="medium",
                        description=f"Column {col} in {table} changed type from {p[col]} to {c[col]}",
                        context={"table": table, "column": col, "old_type": p[col], "new_type": c[col]},
                    ))

        # row count changes
        for table, prev_rows in prev.table_row_counts.items():
            curr_rows = curr.table_row_counts.get(table)
            if curr_rows is None:
                continue

            if prev_rows != curr_rows:
                delta = curr_rows - prev_rows
                severity = "low"
                if abs(delta) > 0.2 * max(prev_rows, 1):
                    severity = "high"

                changes.append(ChangeRecord(
                    project_id=project_id,
                    snapshot_id=curr.snapshot_id,
                    previous_snapshot_id=prev.snapshot_id,
                    change_type="row_count_change",
                    severity=severity,
                    description=(
                        f"Table {table} row count changed from {prev_rows} to {curr_rows} "
                        f"(delta {delta})"
                    ),
                    context={"table": table, "prev_rows": prev_rows, "curr_rows": curr_rows, "delta": delta},
                ))

        # anomaly volume changes
        prev_anoms = prev.anomaly_summary or {}
        curr_anoms = curr.anomaly_summary or {}

        all_types = set(prev_anoms.keys()) | set(curr_anoms.keys())
        for atype in sorted(all_types):
            pv = prev_anoms.get(atype, 0)
            cv = curr_anoms.get(atype, 0)
            if pv == cv:
                continue

            delta = cv - pv
            changes.append(ChangeRecord(
                project_id=project_id,
                snapshot_id=curr.snapshot_id,
                previous_snapshot_id=prev.snapshot_id,
                change_type="anomaly_change",
                severity="low",
                description=(
                    f"Anomaly type {atype} count changed from {pv} to {cv} "
                    f"(delta {delta})"
                ),
                context={"anomaly_type": atype, "prev_count": pv, "curr_count": cv, "delta": delta},
            ))

        return changes
