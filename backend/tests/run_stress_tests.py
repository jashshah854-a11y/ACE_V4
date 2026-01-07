"""
Automated Stress Test Runner for ACE V4

Uploads synthetic datasets, monitors pipeline execution, captures outputs,
and logs anomalies for analysis.
"""

import requests
import json
import time
from pathlib import Path
from datetime import datetime
import pandas as pd
from typing import Dict, List, Optional

class ACEStressTestRunner:
    """Automated test runner for ACE V4 stress testing."""
    
    def __init__(self, api_base="http://localhost:8000", output_dir="data/stress_test_results"):
        self.api_base = api_base
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.results = []
        
    def upload_dataset(self, filepath: Path) -> Optional[str]:
        """Upload a dataset to ACE and return run_id."""
        try:
            with open(filepath, 'rb') as f:
                files = {'file': (filepath.name, f, 'text/csv')}
                response = requests.post(
                    f"{self.api_base}/upload",
                    files=files,
                    timeout=30
                )
                
            if response.status_code == 200:
                data = response.json()
                run_id = data.get('run_id')
                print(f"  ✅ Uploaded {filepath.name} -> Run ID: {run_id}")
                return run_id
            else:
                print(f"  ❌ Upload failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"  ❌ Upload error: {e}")
            return None
    
    def wait_for_completion(self, run_id: str, timeout=300, poll_interval=5) -> bool:
        """Wait for pipeline to complete."""
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                response = requests.get(f"{self.api_base}/runs/{run_id}/status")
                
                if response.status_code == 200:
                    status_data = response.json()
                    status = status_data.get('status', 'unknown')
                    
                    if status == 'completed':
                        print(f"  ✅ Pipeline completed")
                        return True
                    elif status == 'failed':
                        print(f"  ❌ Pipeline failed: {status_data.get('error', 'Unknown error')}")
                        return False
                    else:
                        print(f"  ⏳ Status: {status}...")
                        
                time.sleep(poll_interval)
                
            except Exception as e:
                print(f"  ⚠️  Status check error: {e}")
                time.sleep(poll_interval)
        
        print(f"  ⏱️  Timeout after {timeout}s")
        return False
    
    def fetch_report(self, run_id: str) -> Optional[Dict]:
        """Fetch the generated report."""
        try:
            response = requests.get(f"{self.api_base}/runs/{run_id}/report")
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"  ❌ Report fetch failed: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"  ❌ Report fetch error: {e}")
            return None
    
    def fetch_enhanced_analytics(self, run_id: str) -> Optional[Dict]:
        """Fetch enhanced analytics data."""
        try:
            response = requests.get(f"{self.api_base}/runs/{run_id}/enhanced_analytics")
            
            if response.status_code == 200:
                return response.json()
            else:
                return None
                
        except Exception as e:
            return None
    
    def analyze_results(self, dataset_name: str, run_id: str, report: Dict, enhanced_analytics: Optional[Dict]) -> Dict:
        """Analyze test results and flag anomalies."""
        analysis = {
            "dataset": dataset_name,
            "run_id": run_id,
            "timestamp": datetime.now().isoformat(),
            "pipeline_success": report is not None,
            "anomalies": [],
            "insights": [],
            "metrics": {}
        }
        
        if not report:
            analysis["anomalies"].append("Pipeline failed to generate report")
            return analysis
        
        # Extract key metrics
        metrics = report.get('metrics', {})
        analysis["metrics"] = {
            "data_quality_score": metrics.get('dataQualityScore', 0),
            "confidence_level": metrics.get('confidenceLevel', 0),
            "records_processed": metrics.get('recordsProcessed', 0)
        }
        
        # Check for anomalies
        if analysis["metrics"]["data_quality_score"] == 0:
            analysis["anomalies"].append("Zero data quality score")
        
        if analysis["metrics"]["confidence_level"] < 10:
            analysis["anomalies"].append(f"Very low confidence: {analysis['metrics']['confidence_level']}%")
        
        # Check enhanced analytics
        if enhanced_analytics:
            # Business Intelligence
            bi = enhanced_analytics.get('business_intelligence', {})
            if bi.get('available'):
                analysis["insights"].append("Business Intelligence generated")
                
                churn = bi.get('churn_risk', {})
                if churn.get('at_risk_percentage', 0) > 50:
                    analysis["anomalies"].append(f"Extreme churn risk: {churn['at_risk_percentage']:.1f}%")
            
            # Feature Importance
            fi = enhanced_analytics.get('feature_importance', {})
            if fi.get('available'):
                analysis["insights"].append("Feature Importance computed")
                features = fi.get('feature_importance', [])
                if len(features) > 0:
                    top_feature = features[0]
                    if top_feature.get('importance', 0) > 0.9:
                        analysis["anomalies"].append(f"Single feature dominance: {top_feature['feature']} ({top_feature['importance']:.2f})")
            
            # Correlation Analysis
            corr = enhanced_analytics.get('correlation_analysis', {})
            if corr.get('available'):
                strong_corr = corr.get('strong_correlations', [])
                perfect_corr = [c for c in strong_corr if abs(c.get('pearson', 0)) > 0.99]
                if perfect_corr:
                    analysis["anomalies"].append(f"Perfect correlations detected: {len(perfect_corr)}")
            
            # Distribution Analysis
            dist = enhanced_analytics.get('distribution_analysis', {})
            if dist.get('available'):
                distributions = dist.get('distributions', {})
                high_outliers = [k for k, v in distributions.items() if v.get('outlier_percentage', 0) > 20]
                if high_outliers:
                    analysis["anomalies"].append(f"High outlier columns: {', '.join(high_outliers[:3])}")
        
        return analysis
    
    def run_test(self, filepath: Path, metadata: Dict) -> Dict:
        """Run a single test."""
        dataset_name = filepath.stem
        print(f"\n{'='*60}")
        print(f"Testing: {dataset_name}")
        print(f"Description: {metadata.get('description', 'N/A')}")
        print(f"{'='*60}")
        
        # Upload
        run_id = self.upload_dataset(filepath)
        if not run_id:
            return {
                "dataset": dataset_name,
                "pipeline_success": False,
                "anomalies": ["Upload failed"],
                "insights": []
            }
        
        # Wait for completion
        success = self.wait_for_completion(run_id)
        
        # Fetch results
        report = self.fetch_report(run_id) if success else None
        enhanced_analytics = self.fetch_enhanced_analytics(run_id) if success else None
        
        # Analyze
        analysis = self.analyze_results(dataset_name, run_id, report, enhanced_analytics)
        analysis["expected_challenges"] = metadata.get("expected_challenges", [])
        analysis["success_criteria"] = metadata.get("success_criteria", [])
        
        # Save individual result
        result_file = self.output_dir / f"{dataset_name}_result.json"
        with open(result_file, 'w') as f:
            json.dump(analysis, f, indent=2)
        
        print(f"\n📊 Results:")
        print(f"  Pipeline Success: {analysis['pipeline_success']}")
        print(f"  Metrics: {analysis['metrics']}")
        print(f"  Anomalies: {len(analysis['anomalies'])}")
        if analysis['anomalies']:
            for anomaly in analysis['anomalies']:
                print(f"    ⚠️  {anomaly}")
        print(f"  Insights: {len(analysis['insights'])}")
        if analysis['insights']:
            for insight in analysis['insights']:
                print(f"    💡 {insight}")
        
        return analysis
    
    def run_all_tests(self, dataset_dir="data/stress_tests"):
        """Run all stress tests."""
        dataset_dir = Path(dataset_dir)
        
        # Load metadata
        metadata_file = dataset_dir / "dataset_metadata.json"
        with open(metadata_file, 'r') as f:
            metadata_list = json.load(f)
        
        metadata_map = {m['name']: m for m in metadata_list}
        
        # Find all CSV files
        csv_files = list(dataset_dir.glob("*.csv"))
        
        print(f"\n🚀 Starting Stress Test Suite")
        print(f"📁 Dataset directory: {dataset_dir}")
        print(f"📊 Total datasets: {len(csv_files)}")
        print(f"🎯 API endpoint: {self.api_base}")
        
        # Run tests
        for filepath in csv_files:
            dataset_name = filepath.stem
            metadata = metadata_map.get(dataset_name, {})
            
            result = self.run_test(filepath, metadata)
            self.results.append(result)
            
            # Brief pause between tests
            time.sleep(2)
        
        # Generate summary report
        self.generate_summary_report()
    
    def generate_summary_report(self):
        """Generate comprehensive summary report."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = self.output_dir / f"stress_test_summary_{timestamp}.json"
        
        summary = {
            "timestamp": datetime.now().isoformat(),
            "total_tests": len(self.results),
            "successful_pipelines": sum(1 for r in self.results if r['pipeline_success']),
            "failed_pipelines": sum(1 for r in self.results if not r['pipeline_success']),
            "total_anomalies": sum(len(r['anomalies']) for r in self.results),
            "total_insights": sum(len(r['insights']) for r in self.results),
            "results": self.results
        }
        
        with open(report_file, 'w') as f:
            json.dump(summary, f, indent=2)
        
        print(f"\n{'='*60}")
        print(f"📋 STRESS TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Total Tests: {summary['total_tests']}")
        print(f"✅ Successful: {summary['successful_pipelines']}")
        print(f"❌ Failed: {summary['failed_pipelines']}")
        print(f"⚠️  Total Anomalies: {summary['total_anomalies']}")
        print(f"💡 Total Insights: {summary['total_insights']}")
        print(f"\n📄 Full report saved to: {report_file}")
        print(f"{'='*60}")
        
        # Flag critical issues
        critical_issues = []
        for result in self.results:
            if not result['pipeline_success']:
                critical_issues.append(f"{result['dataset']}: Pipeline failed")
            elif len(result['anomalies']) > 3:
                critical_issues.append(f"{result['dataset']}: {len(result['anomalies'])} anomalies detected")
        
        if critical_issues:
            print(f"\n🚨 CRITICAL ISSUES:")
            for issue in critical_issues:
                print(f"  - {issue}")


if __name__ == "__main__":
    # Check if server is running
    import sys
    
    runner = ACEStressTestRunner()
    
    try:
        response = requests.get(f"{runner.api_base}/health", timeout=5)
        if response.status_code != 200:
            print(f"❌ ACE server not responding correctly at {runner.api_base}")
            print("Please start the backend server first: python backend/server.py")
            sys.exit(1)
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to ACE server at {runner.api_base}")
        print("Please start the backend server first: python backend/server.py")
        sys.exit(1)
    
    # Run all tests
    runner.run_all_tests()
