import requests
import sys

def check_port(port):
    url = f"http://localhost:{port}"
    print(f"--- Checking {url} ---")
    try:
        response = requests.get(url, timeout=2)
        print(f"Status: {response.status_code}")
        print(f"Headers: {response.headers}")
        content_preview = response.text[:200].replace('\n', ' ')
        print(f"Content: {content_preview}")
        if "<!DOCTYPE html>" in content_preview or "<html" in content_preview:
            print(">> TYPE: HTML (Likely Frontend/Next.js)")
        else:
            print(">> TYPE: API/JSON (Likely Backend)")
            
        # Try /docs if possible
        try:
            docs = requests.get(f"{url}/docs", timeout=1)
            print(f"Docs endpoint: {docs.status_code}")
        except:
            print("Docs endpoint: Unreachable")
            
    except requests.exceptions.ConnectionError:
        print(">> Status: CONNECTION REFUSED (Nothing running)")
    except Exception as e:
        print(f">> Error: {e}")
    print("\n")

print("STARTING PORT PROBE...\n")
check_port(8000)
check_port(8001)
print("PROBE COMPLETE.")
