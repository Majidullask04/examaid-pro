"""
NVIDIA Build API Client for vision and text models.
Uses NVIDIA's NIM (NVIDIA Inference Microservices) API format.
"""
import os
from pathlib import Path
from typing import Any
import base64

from dotenv import load_dotenv

BACKEND_ENV = Path(__file__).resolve().parent.parent / ".env"
ROOT_ENV = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(ROOT_ENV)
load_dotenv(BACKEND_ENV, override=True)

# NVIDIA NIM API base URL
NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"


def get_nvidia_key() -> str:
    """Get NVIDIA API key from environment."""
    return os.getenv("NVIDIA_API_KEY", "").strip()


def has_nvidia_key() -> bool:
    """Check if NVIDIA API key is configured."""
    return bool(get_nvidia_key())


async def call_nvidia_vision(
    image_base64: str,
    *,
    prompt: str,
    model: str = "meta/llama-3.2-90b-vision-instruct",
    timeout: float = 60.0,
    max_tokens: int = 2500,
    temperature: float = 0.1,
) -> str:
    """
    Call NVIDIA NIM API for vision analysis.
    
    Args:
        image_base64: Base64 encoded image (without data URL prefix)
        prompt: Text prompt to accompany the image
        model: NVIDIA model to use (e.g., meta/llama-3.2-90b-vision-instruct)
        timeout: Request timeout in seconds
        max_tokens: Maximum tokens to generate
        temperature: Temperature for generation
    
    Returns:
        Generated text response
    """
    api_key = get_nvidia_key()
    if not api_key:
        raise RuntimeError("NVIDIA_API_KEY not configured. Get one from https://build.nvidia.com")
    
    try:
        import httpx
    except ModuleNotFoundError as exc:
        raise RuntimeError("httpx is not installed") from exc
    
    url = f"{NVIDIA_BASE_URL}/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    # NVIDIA NIM format for vision models
    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": prompt
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_base64}"
                        }
                    }
                ]
            }
        ],
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    
    import asyncio
    async with httpx.AsyncClient(timeout=timeout) as client:
        for attempt in range(3):
            try:
                response = await client.post(url, headers=headers, json=payload)
                
                if response.status_code == 429:
                    # Rate limited - wait and retry
                    if attempt < 2:
                        wait_time = 2 ** (attempt + 1)
                        await asyncio.sleep(wait_time)
                        continue
                
                response.raise_for_status()
                data = response.json()
                
                # Extract content from NVIDIA response
                if "choices" in data and len(data["choices"]) > 0:
                    content = data["choices"][0].get("message", {}).get("content", "")
                    if content:
                        return content.strip()
                
                raise RuntimeError(f"Unexpected response format: {data}")
                
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 401:
                    raise RuntimeError("NVIDIA API key is invalid or expired")
                if attempt == 2:
                    raise RuntimeError(f"NVIDIA API request failed after 3 attempts: {e}")
                await asyncio.sleep(2)
            except Exception as e:
                if attempt == 2:
                    raise RuntimeError(f"NVIDIA API error: {e}")
                await asyncio.sleep(2)
    
    raise RuntimeError("Failed to get response from NVIDIA API")


async def call_nvidia_text(
    prompt: str,
    *,
    model: str = "nvidia/nemotron-4-340b-instruct",
    timeout: float = 60.0,
    max_tokens: int = 3000,
    temperature: float = 0.1,
) -> str:
    """
    Call NVIDIA NIM API for text generation.
    
    Args:
        prompt: Text prompt
        model: NVIDIA model to use (e.g., nvidia/nemotron-4-340b-instruct)
        timeout: Request timeout in seconds
        max_tokens: Maximum tokens to generate
        temperature: Temperature for generation
    
    Returns:
        Generated text response
    """
    api_key = get_nvidia_key()
    if not api_key:
        raise RuntimeError("NVIDIA_API_KEY not configured")
    
    try:
        import httpx
    except ModuleNotFoundError as exc:
        raise RuntimeError("httpx is not installed") from exc
    
    url = f"{NVIDIA_BASE_URL}/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    
    import asyncio
    async with httpx.AsyncClient(timeout=timeout) as client:
        for attempt in range(3):
            try:
                response = await client.post(url, headers=headers, json=payload)
                
                if response.status_code == 429 and attempt < 2:
                    await asyncio.sleep(2 ** (attempt + 1))
                    continue
                
                response.raise_for_status()
                data = response.json()
                
                if "choices" in data and len(data["choices"]) > 0:
                    content = data["choices"][0].get("message", {}).get("content", "")
                    if content:
                        return content.strip()
                
                raise RuntimeError(f"Unexpected response format: {data}")
                
            except Exception as e:
                if attempt == 2:
                    raise RuntimeError(f"NVIDIA API error: {e}")
                await asyncio.sleep(2)
    
    raise RuntimeError("Failed to get response from NVIDIA API")


def get_nvidia_vision_model() -> str:
    """Get configured NVIDIA vision model."""
    return os.getenv("NVIDIA_VISION_MODEL", "meta/llama-3.2-90b-vision-instruct")


def get_nvidia_text_model() -> str:
    """Get configured NVIDIA text model."""
    return os.getenv("NVIDIA_TEXT_MODEL", "nvidia/nemotron-4-340b-instruct")
