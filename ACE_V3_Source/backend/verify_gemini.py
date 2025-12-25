import os
from google import genai

key = os.getenv("GEMINI_API_KEY")
print(f"Env Key found: {key is not None}")
if key:
    print(f"Key starts with: {key[:4]}...")

try:
    client = genai.Client(api_key=key)
    print("Client created successfully")
except Exception as e:
    print(f"Client creation failed: {e}")
