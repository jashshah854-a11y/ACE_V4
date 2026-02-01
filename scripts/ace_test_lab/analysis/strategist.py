"""
Strategic Analysis for ACE Test Lab

Analyzes test results and generates upgrade recommendations.
"""
from typing import List, Dict, Any
from datetime import datetime
import json


class Strategist:
    """Analyzes test results and generates strategic recommendations."""
    
    def __init__(self):
        self.findings: List[Dict] = []
        self.metrics: Dict[str, Any] = {}
        
    def record_test_result(
        self,
        test_name: str,
        passed: bool,
        duration_seconds: float,
        details: Dict[str, Any] = None
    ):
        """Record a single test result for analysis."""
        self.findings.append({
            "test_name": test_name,
            "passed": passed,
            "duration_seconds": duration_seconds,
            "details": details or {},
            "timestamp": datetime.utcnow().isoformat(),
        })
    
    def analyze(self) -> Dict[str, Any]:
        """Analyze all test results and generate strategic insights."""
        if not self.findings:
            return {"error": "No test results to analyze"}
        
        # Compute summary metrics
        total = len(self.findings)
        passed = sum(1 for f in self.findings if f["passed"])
        failed = total - passed
        avg_duration = sum(f["duration_seconds"] for f in self.findings) / total
        
        # Identify patterns
        failures = [f for f in self.findings if not f["passed"]]
        slow_tests = [f for f in self.findings if f["duration_seconds"] > 60]
        
        # Generate findings
        analysis_findings = []
        strategic_upgrades = []
        
        # Analyze failure patterns
        failure_categories = self._categorize_failures(failures)
        for category, items in failure_categories.items():
            if items:
                analysis_findings.append({
                    "category": category,
                    "severity": "high" if len(items) > 2 else "medium",
                    "finding": f"{len(items)} tests failed in category: {category}",
                    "tests": [i["test_name"] for i in items],
                    "recommendation": self._get_recommendation(category),
                })
        
        # Analyze performance issues
        if slow_tests:
            analysis_findings.append({
                "category": "performance",
                "severity": "medium",
                "finding": f"{len(slow_tests)} tests exceeded 60s threshold",
                "tests": [t["test_name"] for t in slow_tests],
                "recommendation": "Consider parallel processing or caching for slow operations",
            })
        
        # Generate strategic upgrades based on patterns
        strategic_upgrades = self._generate_strategic_upgrades()
        
        return {
            "run_summary": {
                "total_tests": total,
                "passed": passed,
                "failed": failed,
                "pass_rate": round(passed / total * 100, 1),
                "avg_duration_seconds": round(avg_duration, 2),
                "generated_at": datetime.utcnow().isoformat(),
            },
            "findings": analysis_findings,
            "strategic_upgrades": strategic_upgrades,
            "raw_results": self.findings,
        }
    
    def _categorize_failures(self, failures: List[Dict]) -> Dict[str, List]:
        """Categorize failures by type."""
        categories = {
            "data_handling": [],
            "domain_recognition": [],
            "guardrails": [],
            "performance": [],
            "api": [],
            "edge_cases": [],
            "other": [],
        }
        
        for f in failures:
            name = f["test_name"].lower()
            if any(x in name for x in ["unicode", "format", "type", "missing", "empty"]):
                categories["data_handling"].append(f)
            elif any(x in name for x in ["domain", "ecommerce", "saas", "finance", "healthcare"]):
                categories["domain_recognition"].append(f)
            elif any(x in name for x in ["pii", "causal", "guardrail", "validation"]):
                categories["guardrails"].append(f)
            elif any(x in name for x in ["stress", "concurrent", "large"]):
                categories["performance"].append(f)
            elif any(x in name for x in ["api", "upload", "endpoint"]):
                categories["api"].append(f)
            elif any(x in name for x in ["edge", "outlier", "sparse", "wide"]):
                categories["edge_cases"].append(f)
            else:
                categories["other"].append(f)
        
        return categories
    
    def _get_recommendation(self, category: str) -> str:
        """Get recommendation for a failure category."""
        recommendations = {
            "data_handling": "Review data parsing in intake/stream_loader.py - add more robust type coercion",
            "domain_recognition": "Expand keyword patterns in core/data_typing.py for better domain detection",
            "guardrails": "Check core/safety_guard.py and core/data_guardrails.py for gaps",
            "performance": "Profile agents with cProfile - consider async processing for I/O bound operations",
            "api": "Review api/server.py error handling and add circuit breakers",
            "edge_cases": "Add edge case handling in agents/scanner.py and core/analytics.py",
            "other": "Review specific test failures for root cause",
        }
        return recommendations.get(category, "Investigate test failures manually")
    
    def _generate_strategic_upgrades(self) -> List[str]:
        """Generate strategic upgrade recommendations based on patterns."""
        upgrades = []
        
        # Analyze what domains are being tested
        domain_tests = [f for f in self.findings if "domain" in f["test_name"].lower() 
                       or any(d in f["test_name"].lower() for d in ["ecommerce", "saas", "finance"])]
        
        if not domain_tests:
            upgrades.append("Add more industry-specific test coverage (SaaS, Finance, Healthcare)")
        
        # Check for edge case coverage
        edge_tests = [f for f in self.findings if "edge" in f["test_name"].lower()]
        if len(edge_tests) < 10:
            upgrades.append("Expand edge case test coverage (unicode, sparse data, mixed types)")
        
        # Performance-based upgrades
        slow_count = sum(1 for f in self.findings if f["duration_seconds"] > 30)
        if slow_count > len(self.findings) * 0.2:
            upgrades.extend([
                "Implement streaming progress updates for long-running analyses",
                "Add incremental report generation (show sections as they complete)",
                "Consider WebSocket support for real-time pipeline status",
            ])
        
        # Always suggest these based on common patterns
        upgrades.extend([
            "Add domain-specific persona templates for new industries",
            "Implement confidence calibration based on historical accuracy",
            "Add explainability layer showing which columns drove each insight",
            "Create 'Analysis Preview' feature showing expected outputs before full run",
        ])
        
        return upgrades
    
    def generate_markdown_report(self) -> str:
        """Generate a human-readable markdown report."""
        analysis = self.analyze()
        
        lines = [
            "# ACE Test Lab - Strategic Analysis Report",
            f"\n**Generated:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}",
            "",
            "## Run Summary",
            "",
            f"| Metric | Value |",
            f"|--------|-------|",
            f"| Total Tests | {analysis['run_summary']['total_tests']} |",
            f"| Passed | {analysis['run_summary']['passed']} |",
            f"| Failed | {analysis['run_summary']['failed']} |",
            f"| Pass Rate | {analysis['run_summary']['pass_rate']}% |",
            f"| Avg Duration | {analysis['run_summary']['avg_duration_seconds']}s |",
            "",
        ]
        
        if analysis["findings"]:
            lines.extend([
                "## Findings",
                "",
            ])
            for i, finding in enumerate(analysis["findings"], 1):
                severity_emoji = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(finding["severity"], "⚪")
                lines.extend([
                    f"### {i}. {severity_emoji} {finding['category'].replace('_', ' ').title()}",
                    "",
                    f"**Finding:** {finding['finding']}",
                    "",
                    f"**Recommendation:** {finding['recommendation']}",
                    "",
                ])
        
        if analysis["strategic_upgrades"]:
            lines.extend([
                "## Strategic Upgrades",
                "",
                "Based on test patterns, consider these improvements:",
                "",
            ])
            for upgrade in analysis["strategic_upgrades"]:
                lines.append(f"- {upgrade}")
        
        return "\n".join(lines)


if __name__ == "__main__":
    # Demo
    strategist = Strategist()
    
    # Simulate some test results
    strategist.record_test_result("test_ecommerce_100_rows", True, 12.5)
    strategist.record_test_result("test_saas_500_rows", True, 28.3)
    strategist.record_test_result("test_unicode_chaos", False, 5.2, {"error": "Encoding error"})
    strategist.record_test_result("test_large_10k_rows", True, 95.4)
    strategist.record_test_result("test_pii_detection", False, 8.1, {"error": "SSN not masked"})
    
    print(strategist.generate_markdown_report())
