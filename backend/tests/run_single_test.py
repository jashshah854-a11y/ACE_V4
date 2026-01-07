"""
Single Test Runner - Validates test infrastructure with one dataset
"""

import requests
import json
import time
from pathlib import Path
from datetime import datetime

def run_single_test():
    """Run a single validation test with extreme_imbalance dataset."""
    
    api_base = "http://localhost:8000"
    dataset_path = Path("data/stress_tests/extreme_imbalance.csv")
    
    print("="*60)
    print("ACE V4 - Single Test Validation")
    print("="*60)
    print(f"Dataset: {dataset_path.name}")
    print(f"API: {api_base}")
    print("="*60)
    
    # Check server health
    try:
        response = requests.get(f"{api_base}/health", timeout=5)
        print(f"\n✅ Server health check: {response.status_code}")
    except Exception as e:
        print(f"\n❌ Server not responding: {e}")
        return
    
    # Upload dataset
    print(f"\n📤 Uploading {dataset_path.name}...")
    try:
        with open(dataset_path, 'rb') as f:
            files = {'file': (dataset_path.name, f, 'text/csv')}
            task_intent_json = json.dumps({
                "question": "Analyze this dataset for patterns and insights",
                "confidence_threshold": 80,
                "required_output_type": "descriptive"
            })
            data = {
                'task_intent': task_intent_json,
                'confidence_acknowledged': 'true',
                'fast_mode': 'false'
            }
            response = requests.post(f"{api_base}/run", files=files, data=data, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            run_id = result.get('run_id')
            print(f"✅ Upload successful - Run ID: {run_id}")
            print(f"   Status: {result.get('status')}")
            print(f"   Message: {result.get('message')}")
        else:
            print(f"❌ Upload failed: {response.status_code}")
            print(f"Response: {response.text}")
            return
    except Exception as e:
        print(f"❌ Upload error: {e}")
        return
    
    # Wait for completion
    print(f"\n⏳ Waiting for pipeline to complete...")
    timeout = 300
    poll_interval = 5
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        try:
            response = requests.get(f"{api_base}/runs/{run_id}/status")
            if response.status_code == 200:
                status_data = response.json()
                status = status_data.get('status', 'unknown')
                
                print(f"  Status: {status}")
                
                if status == 'completed':
                    print(f"✅ Pipeline completed!")
                    break
                elif status == 'failed':
                    print(f"❌ Pipeline failed: {status_data.get('error', 'Unknown')}")
                    return
            
            time.sleep(poll_interval)
        except Exception as e:
            print(f"⚠️  Status check error: {e}")
            time.sleep(poll_interval)
    
    # Fetch report
    print(f"\n📊 Fetching report...")
    try:
        response = requests.get(f"{api_base}/runs/{run_id}/report")
        if response.status_code == 200:
            report = response.json()
            print(f"✅ Report fetched")
            
            # Extract key metrics
            metrics = report.get('metrics', {})
            print(f"\n📈 Key Metrics:")
            print(f"  Data Quality: {metrics.get('dataQualityScore', 0)}%")
            print(f"  Confidence: {metrics.get('confidenceLevel', 0)}%")
            print(f"  Records: {metrics.get('recordsProcessed', 0)}")
        else:
            print(f"❌ Report fetch failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Report fetch error: {e}")
    
    # Fetch enhanced analytics
    print(f"\n🔬 Fetching enhanced analytics...")
    try:
        response = requests.get(f"{api_base}/runs/{run_id}/enhanced_analytics")
        if response.status_code == 200:
            analytics = response.json()
            print(f"✅ Enhanced analytics fetched")
            
            # Check what's available
            available_modules = []
            if analytics.get('business_intelligence', {}).get('available'):
                available_modules.append("Business Intelligence")
            if analytics.get('feature_importance', {}).get('available'):
                available_modules.append("Feature Importance")
            if analytics.get('correlation_analysis', {}).get('available'):
                available_modules.append("Correlation Analysis")
            if analytics.get('distribution_analysis', {}).get('available'):
                available_modules.append("Distribution Analysis")
            
            print(f"\n💡 Available Modules:")
            for module in available_modules:
                print(f"  ✓ {module}")
            
            # Save results
            result_file = Path("data/stress_test_results/validation_test_result.json")
            result_file.parent.mkdir(parents=True, exist_ok=True)
            
            result = {
                "timestamp": datetime.now().isoformat(),
                "dataset": dataset_path.name,
                "run_id": run_id,
                "metrics": metrics,
                "enhanced_analytics_modules": available_modules,
                "full_analytics": analytics
            }
            
            with open(result_file, 'w') as f:
                json.dump(result, f, indent=2)
            
            print(f"\n💾 Results saved to: {result_file}")
            
        else:
            print(f"⚠️  Enhanced analytics not available: {response.status_code}")
    except Exception as e:
        print(f"⚠️  Enhanced analytics error: {e}")
    
    print(f"\n{'='*60}")
    print(f"✅ VALIDATION TEST COMPLETE")
    print(f"{'='*60}")
    print(f"\nNext step: Run full test suite with all 9 datasets")
    print(f"Command: python backend/tests/run_stress_tests.py")

if __name__ == "__main__":
    run_single_test()
