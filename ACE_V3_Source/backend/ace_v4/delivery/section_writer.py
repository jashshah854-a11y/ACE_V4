class SectionWriter:
    def write_schema_section(self, schema_overview):
        lines = []
        for table, info in schema_overview.items():
            cols = ", ".join(info["columns"])
            lines.append(f"Table {table} has {info['rows']} rows and columns: {cols}")
        return "\n".join(lines)

    def write_anomaly_section(self, anomaly_overview):
        total = anomaly_overview["total"]
        parts = [f"ACE detected {total} anomalies."]
        for atype, count in anomaly_overview["by_type"].items():
            parts.append(f"• {atype}: {count}")
        return "\n".join(parts)

    def write_version_section(self, version_changes):
        if not version_changes:
            return "No version changes since last ingestion."

        lines = []
        for vc in version_changes:
            lines.append(f"[{vc['severity']}] {vc['description']}")
        return "\n".join(lines)
