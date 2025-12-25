import json
try:
    from google import genai
except ImportError:
    genai = None

try:
    client = genai.Client() if genai else None  # reads GEMINI_API_KEY
except Exception:
    client = None
    print("Warning: Gemini API Key not found. Using mock responses.")

MODEL_NAME = "gemini-2.0-flash"

def call_llm_json(system_prompt: str, user_prompt: str, model_name: str = MODEL_NAME) -> dict:
    """Call Gemini and return parsed JSON. Raises ValueError on bad JSON."""
    if client is None:
        # Mock response for testing without API key
        return {
            "domain_guess": "mock_domain",
            "semantic_roles": {},
            "role_confidence": {},
            "feature_plan": {},
            "warnings": ["Mock mode active"]
        }

    prompt = f"{system_prompt}\n\nUser request:\n{user_prompt}"
    
    # Config for JSON mode
    config = {
        "response_mime_type": "application/json",
        "temperature": 0.1,
        "max_output_tokens": 8192,
    }

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=config
        )
        
        text = response.text.strip()

        # allow the model to optionally wrap in ```json fences
        if text.startswith("```"):
            text = text.strip("`")
            if text.lower().startswith("json"):
                text = text[4:]
        
        return json.loads(text)

    except Exception as e:
        raise ValueError(f"Gemini JSON parse failed or API error: {e}")

def ask_gemini(prompt: str, thinking_level: str = "LOW", json_mode: bool = False) -> str:
    """
    Simple helper for text responses.
    thinking_level can be LOW or HIGH (ignored for flash model).
    json_mode: If True, requests JSON response.
    """
    if client is None:
        return f"MOCK RESPONSE: {prompt[:50]}..."

    # Config
    config = {
        "max_output_tokens": 8192
    }
    if json_mode:
        config["response_mime_type"] = "application/json"

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=config or None
        )
        return response.text
    except Exception as e:
        return f"MOCK RESPONSE (Error: {e}): Processed prompt '{prompt[:20]}...'"
