#!/usr/bin/env python3
"""Quick test script to check API endpoints"""

import requests
import sys

API_BASE = "http://localhost:8001"

def test_health():
    """Test health endpoint"""
    try:
        resp = requests.get(f"{API_BASE}/health")
        print(f"✓ Health check: {resp.status_code}")
        print(f"  Response: {resp.json()}")
        return True
    except Exception as e:
        print(f"✗ Health check failed: {e}")
        return False

def test_runs_list():
    """Test listing runs"""
    try:
        resp = requests.get(f"{API_BASE}/runs")
        print(f"✓ List runs: {resp.status_code}")
        data = resp.json()
        print(f"  Total runs: {data.get('total', 0)}")
        if data.get('runs'):
            print(f"  Recent runs: {data['runs'][:3]}")
        return True
    except Exception as e:
        print(f"✗ List runs failed: {e}")
        return False

def test_run_report(run_id):
    """Test fetching a specific report"""
    try:
        resp = requests.get(f"{API_BASE}/runs/{run_id}/report")
        print(f"✓ Get report for {run_id}: {resp.status_code}")
        if resp.status_code == 200:
            print(f"  Report size: {len(resp.text)} chars")
        elif resp.status_code == 404:
            print(f"  Report not found (may still be processing)")
        else:
            print(f"  Error: {resp.text}")
        return resp.status_code == 200
    except Exception as e:
        print(f"✗ Get report failed: {e}")
        return False

if __name__ == "__main__":
    print("Testing ACE API...\n")

    if not test_health():
        print("\n❌ Server not responding. Is it running?")
        sys.exit(1)

    print()
    test_runs_list()

    if len(sys.argv) > 1:
        run_id = sys.argv[1]
        print()
        test_run_report(run_id)

    print("\n✅ API tests complete")
