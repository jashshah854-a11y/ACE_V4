---
description: Export user-facing reports to Downloads for Brain AI
---

# Export Report to Downloads

This workflow automatically copies completed analysis reports, walkthroughs, and other user-facing markdown documents to the Downloads folder when they're intended for the Brain AI system.

## When to Use

Use this workflow when:

- Completing a comprehensive analysis or health report
- Creating implementation plans or completion reports
- Generating any markdown document the user will share with their Brain AI
- User explicitly mentions "give it to the brain" or similar

## Workflow Steps

### 1. Identify the Report File

Determine which artifact file needs to be exported:

- System health reports
- Mission completion reports
- Implementation plans
- Phase completion walkthroughs
- Any comprehensive analysis documents

### 2. Copy to Downloads with Descriptive Name

```powershell
# Format: ProjectName_ReportType_Date.md
Copy-Item "path/to/artifact.md" -Destination "C:\Users\jashs\Downloads\ProjectName_ReportType.md"
```

**Naming Convention:**

- Use PascalCase with underscores
- Include project name
- Include report type
- Keep concise but descriptive

**Examples:**

- `ACE_V4_System_Health_Report.md`
- `ACE_V4_Mission_Complete.md`
- `ACE_V4_Phase1_Report.md`
- `Phoenix_Implementation_Plan.md`

### 3. Verify Copy Success

```powershell
# Check if file exists in Downloads
Test-Path "C:\Users\jashs\Downloads\ReportName.md"
```

### 4. Notify User

Inform the user that the report has been copied to Downloads and is ready for Brain AI.

## Auto-Trigger Conditions

Automatically apply this workflow when user says:

- "Give it to the brain"
- "Send to brain"
- "Brain needs to see this"
- "Export for brain"
- After completing major analysis/health reports
- After mission completion summaries

## Example Usage

```powershell
# turbo
# Export ACE V4 mission completion report
Copy-Item "C:\Users\jashs\.gemini\antigravity\brain\session-id\mission_complete.md" -Destination "C:\Users\jashs\Downloads\ACE_V4_Mission_Complete.md"
```

## Notes

- Always use absolute paths
- Original artifact remains in place (copy, don't move)
- Use `-Force` flag if file might already exist
- Downloads folder is the standard location for Brain AI ingestion
- Keep filenames under 50 characters when possible
