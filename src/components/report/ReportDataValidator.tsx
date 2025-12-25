import React from "react";
import { AlertTriangle, FileWarning, Database, BarChart3, Users, CheckCircle2, XCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { ReportDataResult } from "@/hooks/useReportData";

interface ValidationIssue {
  field: string;
  severity: "error" | "warning" | "info";
  message: string;
  suggestion?: string;
}

interface ValidationResult {
  isValid: boolean;
  score: number;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

function validateReportData(data: ReportDataResult, content: string): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Check if content exists
  if (!content || content.trim().length === 0) {
    issues.push({
      field: "content",
      severity: "error",
      message: "Report content is empty",
      suggestion: "Ensure the report file was generated correctly",
    });
  }

  // Check metrics
  if (!data.metrics || Object.keys(data.metrics).length === 0) {
    issues.push({
      field: "metrics",
      severity: "warning",
      message: "No metrics data found",
      suggestion: "The report may not contain quantitative analysis",
    });
  }

  // Check personas/segments
  if (!data.personas || data.personas.length === 0) {
    issues.push({
      field: "personas",
      severity: "info",
      message: "No customer personas detected",
      suggestion: "Segmentation analysis may not be available",
    });
  }

  // Check executive brief
  if (!data.executiveBrief?.keyFindings || data.executiveBrief.keyFindings.length === 0) {
    issues.push({
      field: "executiveBrief",
      severity: "warning",
      message: "Executive brief has no key findings",
      suggestion: "Summary insights may be limited",
    });
  }

  // Check hero insight
  if (!data.heroInsight?.keyInsight) {
    issues.push({
      field: "heroInsight",
      severity: "info",
      message: "No primary insight identified",
      suggestion: "The report may lack a clear headline finding",
    });
  }

  // Check confidence value
  if (data.confidenceValue === undefined || data.confidenceValue < 40) {
    issues.push({
      field: "confidence",
      severity: data.confidenceValue === undefined ? "warning" : "info",
      message: data.confidenceValue === undefined 
        ? "Confidence score not calculated" 
        : `Low confidence score (${data.confidenceValue}%)`,
      suggestion: "Results should be treated as exploratory",
    });
  }

  // Check data quality
  if (data.dataQualityValue === undefined || data.dataQualityValue < 50) {
    issues.push({
      field: "dataQuality",
      severity: data.dataQualityValue === undefined ? "warning" : "info",
      message: data.dataQualityValue === undefined 
        ? "Data quality score not available" 
        : `Low data quality score (${data.dataQualityValue}%)`,
      suggestion: "Source data may have completeness issues",
    });
  }

  // Check sections
  if (!data.sections || data.sections.length === 0) {
    issues.push({
      field: "sections",
      severity: "warning",
      message: "No report sections parsed",
      suggestion: "Report structure may not follow expected format",
    });
  }

  // Check for safe mode indicators
  if (data.safeMode) {
    issues.push({
      field: "safeMode",
      severity: "info",
      message: "Report is in safe mode",
      suggestion: "Some features are restricted due to data limitations",
    });
  }

  // Check anomalies
  if (data.anomalies?.count > 10) {
    issues.push({
      field: "anomalies",
      severity: "warning",
      message: `High number of anomalies detected (${data.anomalies.count})`,
      suggestion: "Data may contain significant outliers or quality issues",
    });
  }

  // Calculate validation score
  const errorCount = issues.filter(i => i.severity === "error").length;
  const warningCount = issues.filter(i => i.severity === "warning").length;
  const infoCount = issues.filter(i => i.severity === "info").length;
  
  const score = Math.max(0, 100 - (errorCount * 30) - (warningCount * 10) - (infoCount * 2));
  const isValid = errorCount === 0;

  return {
    isValid,
    score,
    issues,
    summary: {
      errors: errorCount,
      warnings: warningCount,
      info: infoCount,
    },
  };
}

interface ReportDataValidatorProps {
  data: ReportDataResult;
  content: string;
  children: React.ReactNode;
  showAlways?: boolean;
}

export function ReportDataValidator({ 
  data, 
  content, 
  children, 
  showAlways = false 
}: ReportDataValidatorProps) {
  const validation = validateReportData(data, content);

  // If valid and not showing always, just render children
  if (validation.isValid && !showAlways && validation.summary.warnings === 0) {
    return <>{children}</>;
  }

  const getSeverityIcon = (severity: ValidationIssue["severity"]) => {
    switch (severity) {
      case "error": return <XCircle className="h-4 w-4 text-destructive" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-warning" />;
      case "info": return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSeverityBadge = (severity: ValidationIssue["severity"]) => {
    switch (severity) {
      case "error": return <Badge variant="destructive">Error</Badge>;
      case "warning": return <Badge variant="outline" className="border-warning text-warning">Warning</Badge>;
      case "info": return <Badge variant="secondary">Info</Badge>;
    }
  };

  const getFieldIcon = (field: string) => {
    switch (field) {
      case "content": return <FileWarning className="h-4 w-4" />;
      case "metrics": 
      case "dataQuality": return <BarChart3 className="h-4 w-4" />;
      case "personas": return <Users className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  // Critical errors block rendering
  if (!validation.isValid) {
    return (
      <div className="p-6 space-y-4">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Report Validation Failed</AlertTitle>
          <AlertDescription>
            The report data has critical issues that prevent proper rendering.
          </AlertDescription>
        </Alert>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileWarning className="h-5 w-5" />
              Validation Issues
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {validation.issues.map((issue, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                {getFieldIcon(issue.field)}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    {getSeverityBadge(issue.severity)}
                    <span className="text-sm font-medium capitalize">{issue.field}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{issue.message}</p>
                  {issue.suggestion && (
                    <p className="text-xs text-muted-foreground/70 italic">
                      Suggestion: {issue.suggestion}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Warnings/info - show banner but still render children
  return (
    <>
      {(validation.summary.warnings > 0 || (showAlways && validation.issues.length > 0)) && (
        <div className="px-6 pt-4">
          <Alert className="border-warning/50 bg-warning/5">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertTitle className="flex items-center gap-2">
              Data Quality Notice
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-xs text-muted-foreground">Quality Score:</span>
                <Progress value={validation.score} className="w-20 h-2" />
                <span className="text-xs font-medium">{validation.score}%</span>
              </div>
            </AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-1">
                {validation.issues
                  .filter(i => i.severity !== "info" || showAlways)
                  .slice(0, 3)
                  .map((issue, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      {getSeverityIcon(issue.severity)}
                      <span>{issue.message}</span>
                    </div>
                  ))}
                {validation.issues.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{validation.issues.length - 3} more notices
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
      {children}
    </>
  );
}

// Export validation function for use elsewhere
export { validateReportData };
export type { ValidationResult, ValidationIssue };
