import json


class ExportFormatter:
    def to_json(self, summary_block, sections):
        return json.dumps({
            "summary": summary_block,
            "sections": sections
        }, indent=2)

    def to_markdown(self, summary_block, sections):
        lines = []
        lines.append(f"# ACE V4 Insight Report")
        lines.append(f"**Tables:** {summary_block['tables']}")
        lines.append(f"**Total Rows:** {summary_block['total_rows']}")
        lines.append("")
        lines.append("## Schema Overview")
        lines.append(sections["schema"])
        lines.append("")
        lines.append("## Anomalies")
        lines.append(sections["anomalies"])
        lines.append("")
        lines.append("## Version Changes")
        lines.append(sections["versions"])
        return "\n".join(lines)

    def to_text(self, summary_block, sections):
        return (
            "ACE Insight Report\n\n"
            f"Tables: {summary_block['tables']}\n"
            f"Total Rows: {summary_block['total_rows']}\n\n"
            "Schema\n"
            + sections["schema"] + "\n\n"
            "Anomalies\n"
            + sections["anomalies"] + "\n\n"
            "Version Changes\n"
            + sections["versions"]
        )
