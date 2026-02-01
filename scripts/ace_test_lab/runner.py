"""
ACE Test Lab - Main Test Runner

A comprehensive testing system for stress-testing ACE V4.
Generates synthetic datasets, runs them through production/local API,
and produces strategic upgrade recommendations.

Usage:
    python runner.py --all                    # Run all tests
    python runner.py --stress                 # Run stress tests only
    python runner.py --domains                # Run domain tests only
    python runner.py --edge                   # Run edge case tests only
    python runner.py --prod                   # Use production API
    python runner.py --quick                  # Quick smoke test (5 tests)
"""
import argparse
import requests
import time
import json
import sys
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

# Add parent paths
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "backend"))

from generators.synthetic_data import generate_dataset
from generators.edge_cases import generate_edge_case, EDGE_CASES
from analysis.strategist import Strategist
from config import PRODUCTION_API, LOCAL_API, THRESHOLDS, DOMAINS


class ACETestRunner:
    """Main test orchestrator for ACE V4."""
    
    def __init__(self, api_url: str = None, timeout: int = 180):
        self.api_url = api_url or LOCAL_API
        self.timeout = timeout
        self.strategist = Strategist()
        self.results: List[Dict] = []
        
    def submit_run(self, csv_data: str, filename: str, task_intent: Dict) -> Dict:
        """Submit a test run to the ACE API."""
        url = f"{self.api_url}/run"
        
        files = {
            "file": (filename, csv_data, "text/csv")
        }
        data = {
            "task_intent": json.dumps(task_intent),
            "confidence_acknowledged": "true"
        }
        
        try:
            response = requests.post(url, files=files, data=data, timeout=30)
            return response.json()
        except Exception as e:
            return {"error": str(e)}
    
    def wait_for_completion(self, run_id: str, max_wait: int = 180) -> Dict:
        """Poll for run completion."""
        url = f"{self.api_url}/run/{run_id}/status"
        start = time.time()
        
        while time.time() - start < max_wait:
            try:
                response = requests.get(url, timeout=10)
                if response.status_code == 200:
                    status = response.json()
                    if status.get("status") in ["complete", "failed", "completed_with_errors"]:
                        return status
                time.sleep(2)
            except Exception as e:
                time.sleep(5)
        
        return {"status": "timeout", "error": f"Timed out after {max_wait}s"}
    
    def get_report(self, run_id: str) -> Optional[str]:
        """Get the final report for a run."""
        url = f"{self.api_url}/run/{run_id}/governed_report"
        try:
            response = requests.get(url, timeout=30)
            if response.status_code == 200:
                return response.text
        except:
            pass
        return None
    
    def run_test(
        self,
        test_name: str,
        csv_data: str,
        expected_outcome: Dict = None
    ) -> Dict:
        """Run a single test and record results."""
        print(f"  Running: {test_name}...", end=" ", flush=True)
        start_time = time.time()
        
        # Domain-specific task intents that pass strict API validation
        task_intents = {
            "marketing": {
                "primary_question": "Which marketing campaigns have the highest ROI and should receive more budget allocation?",
                "decision_context": "Planning quarterly marketing budget allocation across digital advertising channels to maximize customer acquisition while maintaining profitability targets",
                "success_criteria": "Clear ranking of campaigns by ROI with actionable budget recommendations",
            },
            "ecommerce": {
                "primary_question": "Which customer segments generate the highest lifetime value and what purchase patterns define them?",
                "decision_context": "Developing targeted retention strategies and personalized marketing for high-value customer segments",
                "success_criteria": "Distinct customer segments with clear behavioral patterns and revenue metrics",
            },
            "saas": {
                "primary_question": "Which users are most likely to churn and what engagement patterns predict retention?",
                "decision_context": "Building proactive intervention strategies to reduce churn and increase monthly recurring revenue",
                "success_criteria": "Churn risk scores with leading indicators and intervention recommendations",
            },
            "finance": {
                "primary_question": "Which transactions show patterns of potential fraud and what risk thresholds should be implemented?",
                "decision_context": "Establishing fraud detection parameters while minimizing false positives in payment processing",
                "success_criteria": "Risk classification tiers with precision-recall tradeoff recommendations",
            },
            "healthcare": {
                "primary_question": "Which patient groups have highest readmission risk and what factors are most predictive?",
                "decision_context": "Developing care protocols to reduce 30-day readmission rates while optimizing resource allocation",
                "success_criteria": "Patient risk stratification with intervention priority recommendations",
            },
            "hr": {
                "primary_question": "Which employees are at highest risk of attrition and what workplace factors drive retention?",
                "decision_context": "Creating targeted retention initiatives and improving employee satisfaction metrics",
                "success_criteria": "Attrition risk scores with key driver analysis and retention recommendations",
            },
            "default": {
                "primary_question": "Which data segments show the highest value potential and what patterns differentiate performance levels?",
                "decision_context": "Developing data-driven resource allocation strategy to maximize value generation across identified segments",
                "success_criteria": "Distinct performance tiers with quantified characteristics and prioritization framework",
            }
        }
        
        # Determine which domain this test maps to
        domain = "default"
        for d in task_intents.keys():
            if d in test_name.lower():
                domain = d
                break
        
        task_intent = {
            **task_intents[domain],
            "required_output_type": "descriptive",
            "confidence_threshold": 0.6
        }
        
        # Submit run
        submit_result = self.submit_run(csv_data, f"{test_name}.csv", task_intent)
        
        if "error" in submit_result:
            duration = time.time() - start_time
            print(f"❌ Submit Failed ({duration:.1f}s)")
            self.strategist.record_test_result(test_name, False, duration, submit_result)
            return {"passed": False, "error": submit_result["error"]}
        
        run_id = submit_result.get("run_id")
        if not run_id:
            duration = time.time() - start_time
            print(f"❌ No run_id ({duration:.1f}s)")
            self.strategist.record_test_result(test_name, False, duration, submit_result)
            return {"passed": False, "error": "No run_id in response"}
        
        # Wait for completion
        final_status = self.wait_for_completion(run_id, self.timeout)
        duration = time.time() - start_time
        
        passed = final_status.get("status") == "complete"
        
        # Get report if available
        report = None
        if passed:
            report = self.get_report(run_id)
        
        result = {
            "passed": passed,
            "run_id": run_id,
            "status": final_status.get("status"),
            "duration_seconds": duration,
            "steps_completed": final_status.get("steps_completed", []),
            "failed_steps": final_status.get("failed_steps", []),
            "report_length": len(report) if report else 0,
        }
        
        if passed:
            print(f"PASSED ({duration:.1f}s, {len(final_status.get('steps_completed', []))} steps)")
        else:
            print(f"FAILED: {final_status.get('status')} ({duration:.1f}s)")
        
        self.strategist.record_test_result(test_name, passed, duration, result)
        self.results.append({"test_name": test_name, **result})
        
        return result
    
    # ==================== TEST SUITES ====================
    
    def run_stress_tests(self):
        """Run volume and performance stress tests."""
        print("\n📊 STRESS TESTS")
        print("=" * 50)
        
        tests = [
            ("stress_100_rows", "marketing", 100),
            ("stress_500_rows", "ecommerce", 500),
            ("stress_1000_rows", "saas", 1000),
            ("stress_2000_rows", "finance", 2000),
        ]
        
        for test_name, domain, rows in tests:
            csv_data = generate_dataset(domain, rows, seed=42)
            self.run_test(test_name, csv_data)
    
    def run_domain_tests(self):
        """Run industry-specific domain tests."""
        print("\n🏢 DOMAIN TESTS")
        print("=" * 50)
        
        for domain in DOMAINS.keys():
            test_name = f"domain_{domain}"
            csv_data = generate_dataset(domain, 200, seed=42)
            self.run_test(test_name, csv_data)
    
    def run_edge_case_tests(self):
        """Run edge case tests."""
        print("\n⚠️ EDGE CASE TESTS")
        print("=" * 50)
        
        # Run subset of edge cases (most impactful)
        priority_cases = [
            "unicode_chaos",
            "date_format_mix",
            "extreme_outliers",
            "missing_90_percent",
            "mixed_types",
            "perfect_correlation",
            "pii_data",
            "high_cardinality",
        ]
        
        for case in priority_cases:
            test_name = f"edge_{case}"
            try:
                csv_data = generate_edge_case(case, 100, seed=42)
                self.run_test(test_name, csv_data)
            except Exception as e:
                print(f"  ⚠️ Skipping {case}: {e}")
    
    def run_quick_smoke_test(self):
        """Run a quick smoke test (5 tests)."""
        print("\n🔥 QUICK SMOKE TEST")
        print("=" * 50)
        
        # One small test per category
        tests = [
            ("smoke_marketing", generate_dataset("marketing", 100, seed=42)),
            ("smoke_ecommerce", generate_dataset("ecommerce", 100, seed=42)),
            ("smoke_unicode", generate_edge_case("unicode_chaos", 50, seed=42)),
            ("smoke_outliers", generate_edge_case("extreme_outliers", 50, seed=42)),
            ("smoke_mixed", generate_edge_case("mixed_types", 50, seed=42)),
        ]
        
        for test_name, csv_data in tests:
            self.run_test(test_name, csv_data)
    
    def run_all_tests(self):
        """Run all test suites."""
        self.run_stress_tests()
        self.run_domain_tests()
        self.run_edge_case_tests()
    
    def generate_report(self) -> str:
        """Generate the final strategic report."""
        return self.strategist.generate_markdown_report()
    
    def save_results(self, output_dir: Path = None):
        """Save results to files."""
        if output_dir is None:
            output_dir = Path(__file__).parent / "reports"
        output_dir.mkdir(exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        
        # Save JSON results
        json_path = output_dir / f"{timestamp}_results.json"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(self.strategist.analyze(), f, indent=2, default=str, ensure_ascii=False)
        print(f"\nJSON results saved: {json_path}")
        
        # Save markdown report
        md_path = output_dir / f"{timestamp}_strategic_report.md"
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(self.generate_report())
        print(f"Markdown report saved: {md_path}")
        
        return json_path, md_path


def main():
    parser = argparse.ArgumentParser(description="ACE V4 Test Lab")
    parser.add_argument("--prod", action="store_true", help="Use production API")
    parser.add_argument("--local", action="store_true", help="Use local API (default)")
    parser.add_argument("--all", action="store_true", help="Run all tests")
    parser.add_argument("--stress", action="store_true", help="Run stress tests")
    parser.add_argument("--domains", action="store_true", help="Run domain tests")
    parser.add_argument("--edge", action="store_true", help="Run edge case tests")
    parser.add_argument("--quick", action="store_true", help="Quick smoke test")
    parser.add_argument("--timeout", type=int, default=180, help="Timeout per test (seconds)")
    
    args = parser.parse_args()
    
    # Determine API URL
    api_url = PRODUCTION_API if args.prod else LOCAL_API
    
    print("=" * 60)
    print("🧪 ACE V4 TEST LAB")
    print("=" * 60)
    print(f"API: {api_url}")
    print(f"Timeout: {args.timeout}s per test")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Check API health
    try:
        health = requests.get(f"{api_url}/health", timeout=10)
        if health.status_code == 200:
            print(f"API Status: ✅ Healthy")
        else:
            print(f"API Status: ⚠️ HTTP {health.status_code}")
    except Exception as e:
        print(f"API Status: ❌ Unreachable ({e})")
        sys.exit(1)
    
    runner = ACETestRunner(api_url=api_url, timeout=args.timeout)
    
    # Determine which tests to run
    if args.all:
        runner.run_all_tests()
    elif args.stress:
        runner.run_stress_tests()
    elif args.domains:
        runner.run_domain_tests()
    elif args.edge:
        runner.run_edge_case_tests()
    elif args.quick or not any([args.all, args.stress, args.domains, args.edge]):
        runner.run_quick_smoke_test()
    
    # Generate and save results
    print("\n" + "=" * 60)
    print("📊 GENERATING STRATEGIC ANALYSIS")
    print("=" * 60)
    
    json_path, md_path = runner.save_results()
    
    # Print summary
    analysis = runner.strategist.analyze()
    print("\n" + "=" * 60)
    print("📋 SUMMARY")
    print("=" * 60)
    print(f"Total Tests: {analysis['run_summary']['total_tests']}")
    print(f"Passed: {analysis['run_summary']['passed']}")
    print(f"Failed: {analysis['run_summary']['failed']}")
    print(f"Pass Rate: {analysis['run_summary']['pass_rate']}%")
    
    if analysis["findings"]:
        print(f"\n🔍 Key Findings: {len(analysis['findings'])}")
        for finding in analysis["findings"][:3]:
            print(f"  - {finding['finding']}")
    
    if analysis["strategic_upgrades"]:
        print(f"\n💡 Strategic Upgrades: {len(analysis['strategic_upgrades'])}")
        for upgrade in analysis["strategic_upgrades"][:5]:
            print(f"  - {upgrade}")
    
    print(f"\n✅ Complete! Reports saved to: {json_path.parent}")


if __name__ == "__main__":
    main()
