#!/usr/bin/env python3
"""End-to-end test of the ACE pipeline"""
import subprocess
import time
import requests
import json
import signal
import sys
from pathlib import Path
import pandas as pd

# Colors for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_step(msg):
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}{msg}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")

def print_success(msg):
    print(f"{GREEN}✓ {msg}{RESET}")

def print_error(msg):
    print(f"{RED}✗ {msg}{RESET}")

def print_info(msg):
    print(f"{YELLOW}→ {msg}{RESET}")

def create_test_data():
    """Create a sample CSV file for testing"""
    print_step("STEP 1: Creating test dataset")

    df = pd.DataFrame({
        'customer_id': range(1, 101),
        'revenue': [1000 + i * 50 for i in range(100)],
        'cost': [500 + i * 20 for i in range(100)],
        'transactions': [10 + i % 20 for i in range(100)],
        'customer_type': ['Premium' if i % 3 == 0 else 'Standard' for i in range(100)],
        'region': [['North', 'South', 'East', 'West'][i % 4] for i in range(100)]
    })

    test_file = Path('/tmp/test_customer_data.csv')
    df.to_csv(test_file, index=False)
    print_success(f"Created test dataset with {len(df)} rows and {len(df.columns)} columns")
    print_info(f"File location: {test_file}")

    return test_file

def start_server():
    """Start the FastAPI server in background"""
    print_step("STEP 2: Starting backend server")

    backend_dir = Path(__file__).parent / 'backend'

    # Start server
    process = subprocess.Popen(
        [sys.executable, '-m', 'uvicorn', 'api.server:app', '--host', '0.0.0.0', '--port', '8000'],
        cwd=str(backend_dir),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        preexec_fn=lambda: signal.signal(signal.SIGINT, signal.SIG_IGN)
    )

    print_info("Waiting for server to start...")
    time.sleep(5)

    # Check if server is running
    try:
        response = requests.get('http://localhost:8000/health', timeout=5)
        if response.status_code == 200:
            print_success("Server started successfully")
            print_info(f"Health check: {response.json()}")
            return process
        else:
            print_error(f"Server health check failed: {response.status_code}")
            return None
    except Exception as e:
        print_error(f"Server failed to start: {e}")
        return None

def test_preview_endpoint(test_file):
    """Test the /run/preview endpoint"""
    print_step("STEP 3: Testing dataset preview endpoint")

    try:
        with open(test_file, 'rb') as f:
            files = {'file': (test_file.name, f, 'text/csv')}
            response = requests.post('http://localhost:8000/run/preview', files=files, timeout=30)

        if response.status_code == 200:
            preview = response.json()
            print_success("Preview endpoint successful")
            print_info(f"Row count: {preview['row_count']}")
            print_info(f"Column count: {preview['column_count']}")
            print_info(f"Quality score: {preview['quality_score']}")
            print_info(f"Schema columns: {', '.join([c['name'] for c in preview['schema_map']])}")
            print_info(f"Detected capabilities:")
            for key, value in preview['detected_capabilities'].items():
                print(f"  - {key}: {value}")
            return True
        else:
            print_error(f"Preview failed: {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
    except Exception as e:
        print_error(f"Preview test failed: {e}")
        return False

def test_run_submission(test_file):
    """Test the /run endpoint"""
    print_step("STEP 4: Testing run submission endpoint")

    try:
        task_intent = {
            "primary_question": "What factors drive customer revenue?",
            "decision_context": "Customer segmentation and pricing strategy",
            "success_criteria": "Clear insights with confidence scores",
            "required_output_type": "descriptive"
        }

        with open(test_file, 'rb') as f:
            files = {'file': (test_file.name, f, 'text/csv')}
            data = {
                'task_intent': json.dumps(task_intent),
                'confidence_acknowledged': 'true',
                'mode': 'full'
            }
            response = requests.post('http://localhost:8000/run', files=files, data=data, timeout=30)

        if response.status_code == 200:
            result = response.json()
            print_success("Run submission successful")
            print_info(f"Run ID: {result['run_id']}")
            print_info(f"Status: {result['status']}")
            print_info(f"Message: {result['message']}")
            return result['run_id']
        else:
            print_error(f"Run submission failed: {response.status_code}")
            print_error(f"Response: {response.text}")
            return None
    except Exception as e:
        print_error(f"Run submission test failed: {e}")
        return None

def test_run_progress(run_id):
    """Test the /runs/{run_id}/progress endpoint"""
    print_step("STEP 5: Testing run progress endpoint")

    if not run_id:
        print_error("No run_id provided, skipping progress test")
        return False

    try:
        response = requests.get(f'http://localhost:8000/runs/{run_id}/progress', timeout=10)

        if response.status_code == 200:
            progress = response.json()
            print_success("Progress endpoint successful")
            print_info(f"Job status: {progress['job']['status']}")
            print_info(f"Message: {progress['job']['message']}")
            if progress.get('progress'):
                print_info(f"Progress details: {json.dumps(progress['progress'], indent=2)}")
            return True
        else:
            print_error(f"Progress check failed: {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
    except Exception as e:
        print_error(f"Progress test failed: {e}")
        return False

def test_list_runs():
    """Test the /runs endpoint"""
    print_step("STEP 6: Testing list runs endpoint")

    try:
        response = requests.get('http://localhost:8000/runs?limit=10', timeout=10)

        if response.status_code == 200:
            result = response.json()
            print_success("List runs endpoint successful")
            print_info(f"Total runs: {result['total']}")
            print_info(f"Runs in response: {len(result['runs'])}")
            if result['runs']:
                print_info(f"Latest run ID: {result['runs'][0]}")
            return True
        else:
            print_error(f"List runs failed: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"List runs test failed: {e}")
        return False

def cleanup(process, test_file):
    """Clean up resources"""
    print_step("STEP 7: Cleanup")

    if process:
        print_info("Stopping server...")
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
        print_success("Server stopped")

    if test_file and test_file.exists():
        test_file.unlink()
        print_success("Test file removed")

def main():
    print(f"\n{GREEN}{'='*60}")
    print("  ACE PIPELINE END-TO-END TEST")
    print(f"{'='*60}{RESET}\n")

    process = None
    test_file = None

    try:
        # Run all tests
        test_file = create_test_data()
        process = start_server()

        if not process:
            print_error("Failed to start server. Aborting tests.")
            return 1

        # Test each endpoint
        preview_ok = test_preview_endpoint(test_file)
        run_id = test_run_submission(test_file)
        progress_ok = test_run_progress(run_id)
        list_ok = test_list_runs()

        # Summary
        print_step("TEST SUMMARY")
        results = [
            ("Dataset creation", True),
            ("Server startup", process is not None),
            ("Preview endpoint", preview_ok),
            ("Run submission", run_id is not None),
            ("Progress tracking", progress_ok),
            ("List runs", list_ok)
        ]

        passed = sum(1 for _, result in results if result)
        total = len(results)

        for test_name, result in results:
            if result:
                print_success(f"{test_name}")
            else:
                print_error(f"{test_name}")

        print(f"\n{BLUE}{'='*60}{RESET}")
        if passed == total:
            print(f"{GREEN}ALL TESTS PASSED ({passed}/{total}){RESET}")
            exit_code = 0
        else:
            print(f"{YELLOW}SOME TESTS FAILED ({passed}/{total}){RESET}")
            exit_code = 1
        print(f"{BLUE}{'='*60}{RESET}\n")

        return exit_code

    except KeyboardInterrupt:
        print_error("\nTest interrupted by user")
        return 1
    except Exception as e:
        print_error(f"Test suite failed: {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        cleanup(process, test_file)

if __name__ == '__main__':
    sys.exit(main())
