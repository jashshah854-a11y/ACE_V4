import sys
import os
import subprocess
import time

def run_all_tests():
    start_dir = os.getcwd()
    search_dirs = ['tests', 'ace_v4']
    
    test_files = []
    print("🔍 Discovering test files...")
    for d in search_dirs:
        for root, _, files in os.walk(d):
            for f in files:
                if f.startswith("test_") and f.endswith(".py"):
                    path = os.path.join(root, f)
                    test_files.append(path)
    
    print(f"🚀 Found {len(test_files)} test files. Running them now...\n")
    
    passed = 0
    failed = 0
    failures = []
    
    start_time = time.time()
    
    for i, test_file in enumerate(test_files, 1):
        print(f"[{i}/{len(test_files)}] Running {test_file}...", end=" ", flush=True)
        
        # Run as subprocess
        env = os.environ.copy()
        env["PYTHONPATH"] = start_dir
        
        try:
            # Capture output to avoid clutter, print only on fail
            result = subprocess.run(
                [sys.executable, test_file],
                cwd=start_dir,
                env=env,
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                print("✅ PASSED")
                passed += 1
            else:
                print("❌ FAILED")
                failed += 1
                failures.append((test_file, result.stdout, result.stderr))
        except Exception as e:
            print(f"❌ ERROR: {e}")
            failed += 1
            failures.append((test_file, "", str(e)))
            
    duration = time.time() - start_time
    
    print("\n" + "="*50)
    print(f"Test Summary: {passed} passed, {failed} failed in {duration:.2f}s")
    print("="*50)
    
    if failed > 0:
        print("\n❌ FAILURES DETAILS:\n")
        for f, out, err in failures:
            print(f"--- {f} ---")
            print("STDOUT:", out)
            print("STDERR:", err)
            print("-" * 30)
        sys.exit(1)
    else:
        print("\n✅ ALL TESTS PASSED!")
        sys.exit(0)

if __name__ == "__main__":
    run_all_tests()
