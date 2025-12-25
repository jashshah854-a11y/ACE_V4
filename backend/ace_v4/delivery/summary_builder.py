class SummaryBuilder:
    def __init__(self):
        pass

    def build(self, master, anomalies, version_changes):
        """
        master: MasterDataset
        anomalies: list of AnomalyRecord
        version_changes: list of ChangeRecord
        """

        total_rows = sum(len(df) for df in master.tables.values())
        total_tables = len(master.tables)

        anomaly_count = len(anomalies)
        anomaly_breakdown = {}

        for a in anomalies:
            anomaly_breakdown[a.anomaly_type] = anomaly_breakdown.get(a.anomaly_type, 0) + 1

        schema_summary = {
            table: {"columns": list(df.columns), "rows": len(df)}
            for table, df in master.tables.items()
        }

        block = {
            "project_id": master.project_id,
            "tables": total_tables,
            "total_rows": total_rows,
            "schema_overview": schema_summary,
            "anomaly_overview": {
                "total": anomaly_count,
                "by_type": anomaly_breakdown,
            },
            "integration_scores": master.integration_scores,
            "version_changes": [
                {
                    "type": c.change_type,
                    "severity": c.severity,
                    "description": c.description,
                }
                for c in version_changes
            ],
        }

        return block
