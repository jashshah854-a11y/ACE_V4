"""
LLM Client with retry and backoff for ACE V4.

Features:
- Retry with exponential backoff for transient failures
- Configurable retry attempts and delays
- Graceful fallback to mock responses
"""

import json
import time
import os
from typing import Optional

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

# Retry configuration
MAX_RETRIES = int(os.getenv("LLM_MAX_RETRIES", "3"))
INITIAL_BACKOFF_SECONDS = float(os.getenv("LLM_INITIAL_BACKOFF", "1.0"))
MAX_BACKOFF_SECONDS = float(os.getenv("LLM_MAX_BACKOFF", "30.0"))
BACKOFF_MULTIPLIER = 2.0

# Retryable error patterns
RETRYABLE_ERRORS = [
    "rate limit",
    "quota exceeded",
    "resource exhausted",
    "timeout",
    "connection",
    "503",
    "504",
    "500",
    "temporarily unavailable",
    "overloaded",
]


def _is_retryable_error(error: Exception) -> bool:
    """Check if an error is retryable."""
    error_str = str(error).lower()
    return any(pattern in error_str for pattern in RETRYABLE_ERRORS)


def _retry_with_backoff(func, *args, **kwargs):
    """
    Execute a function with retry and exponential backoff.

    Args:
        func: Function to execute
        *args, **kwargs: Arguments to pass to the function

    Returns:
        Result from the function

    Raises:
        Last exception if all retries fail
    """
    last_error = None
    backoff = INITIAL_BACKOFF_SECONDS

    for attempt in range(MAX_RETRIES + 1):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            last_error = e

            # Check if this is a retryable error
            if not _is_retryable_error(e) or attempt >= MAX_RETRIES:
                raise

            # Log retry attempt
            print(f"[LLM] Retrying after error (attempt {attempt + 1}/{MAX_RETRIES}): {e}")

            # Wait with exponential backoff
            time.sleep(min(backoff, MAX_BACKOFF_SECONDS))
            backoff *= BACKOFF_MULTIPLIER

    raise last_error


def call_llm_json(system_prompt: str, user_prompt: str, model_name: str = MODEL_NAME) -> dict:
    """
    Call Gemini and return parsed JSON with retry support.

    Args:
        system_prompt: System context/instructions
        user_prompt: User query
        model_name: Model to use

    Returns:
        Parsed JSON response as dict

    Raises:
        ValueError: On bad JSON or API error after all retries
    """
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

    def _make_call():
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

    try:
        return _retry_with_backoff(_make_call)
    except json.JSONDecodeError as e:
        raise ValueError(f"Gemini returned invalid JSON: {e}")
    except Exception as e:
        raise ValueError(f"Gemini API error after {MAX_RETRIES} retries: {e}")


def ask_gemini(prompt: str, thinking_level: str = "LOW", json_mode: bool = False) -> str:
    """
    Simple helper for text responses with retry support.

    Args:
        prompt: The prompt to send
        thinking_level: LOW or HIGH (ignored for flash model)
        json_mode: If True, requests JSON response

    Returns:
        Response text from the model
    """
    if client is None:
        return f"MOCK RESPONSE: {prompt[:50]}..."

    # Config
    config = {
        "max_output_tokens": 8192
    }
    if json_mode:
        config["response_mime_type"] = "application/json"

    def _make_call():
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=config or None
        )
        return response.text

    try:
        return _retry_with_backoff(_make_call)
    except Exception as e:
        # Graceful fallback for non-critical text calls
        print(f"[LLM] Warning: ask_gemini failed after retries: {e}")
        return f"MOCK RESPONSE (Error after retries): Processed prompt '{prompt[:20]}...'"


def call_llm_with_timeout(
    system_prompt: str,
    user_prompt: str,
    timeout_seconds: int = 60,
    model_name: str = MODEL_NAME
) -> Optional[dict]:
    """
    Call LLM with a timeout. Returns None if timeout is exceeded.

    Args:
        system_prompt: System context/instructions
        user_prompt: User query
        timeout_seconds: Maximum time to wait
        model_name: Model to use

    Returns:
        Parsed JSON response or None on timeout
    """
    import threading

    result = [None]
    error = [None]

    def _call():
        try:
            result[0] = call_llm_json(system_prompt, user_prompt, model_name)
        except Exception as e:
            error[0] = e

    thread = threading.Thread(target=_call)
    thread.start()
    thread.join(timeout=timeout_seconds)

    if thread.is_alive():
        print(f"[LLM] Warning: Call timed out after {timeout_seconds}s")
        return None

    if error[0]:
        raise error[0]

    return result[0]


def call_gemini(
    prompt: str,
    temperature: float = 0.3,
    max_tokens: int = 4096,
    parse_json: bool = False,
) -> str | dict:
    """
    Flexible Gemini API call for insight generation.
    
    Args:
        prompt: The full prompt to send
        temperature: Creativity level (0.0-1.0)
        max_tokens: Maximum output tokens
        parse_json: If True, parse response as JSON
        
    Returns:
        Response text or parsed dict if parse_json=True
    """
    if client is None:
        mock = '{"insights": [], "recommendations": []}' if parse_json else "MOCK: No API client"
        return json.loads(mock) if parse_json else mock
    
    config = {
        "temperature": temperature,
        "max_output_tokens": max_tokens,
    }
    if parse_json:
        config["response_mime_type"] = "application/json"
    
    def _make_call():
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=config,
        )
        
        text = response.text.strip()
        
        # Clean markdown code fences if present
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:])  # Remove first line with ```
        if text.endswith("```"):
            text = text.rsplit("```", 1)[0]
        text = text.strip()
        
        if parse_json:
            return json.loads(text)
        return text
    
    try:
        return _retry_with_backoff(_make_call)
    except json.JSONDecodeError as e:
        if parse_json:
            print(f"[LLM] JSON parse error: {e}")
            return {"error": str(e), "raw": ""}
        raise
    except Exception as e:
        print(f"[LLM] Gemini call failed: {e}")
        if parse_json:
            return {"error": str(e)}
        return f"ERROR: {e}"
