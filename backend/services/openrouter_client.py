import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv


BACKEND_ENV = Path(__file__).resolve().parent.parent / ".env"
ROOT_ENV = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(ROOT_ENV)
load_dotenv(BACKEND_ENV, override=True)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# NVIDIA API configuration
NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"


def get_openrouter_key() -> str:
    return os.getenv("OPENROUTER_API_KEY", "").strip()


def has_openrouter_key() -> bool:
    return bool(get_openrouter_key())


async def call_openrouter(
    messages: list[dict[str, Any]],
    model: str,
    *,
    timeout: float = 30.0,
    max_tokens: int = 3000,
    temperature: float = 0.1,
    response_format: dict[str, Any] | None = None,
) -> str:
    api_key = get_openrouter_key()
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY not configured")

    try:
        import httpx
    except ModuleNotFoundError as exc:
        raise RuntimeError("httpx is not installed") from exc

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://knightsky.dpdns.org",
        "X-Title": "ExamHelper R22",
    }
    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    if response_format:
        payload["response_format"] = response_format

    import asyncio
    async with httpx.AsyncClient(timeout=timeout) as client:
        for attempt in range(3):
            response = await client.post(OPENROUTER_URL, headers=headers, json=payload)
            if response.status_code == 429 and attempt < 2:
                await asyncio.sleep(2)
                continue
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]


async def call_text_model(
    prompt: str,
    model: str,
    *,
    timeout: float = 30.0,
    max_tokens: int = 3000,
    temperature: float = 0.1,
) -> str:
    from core.logger import logger
    try:
        return await call_openrouter(
            [{"role": "user", "content": prompt}],
            model,
            timeout=timeout,
            max_tokens=max_tokens,
            temperature=temperature,
        )
    except Exception as e:
        import os
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key:
            logger.info(f"OpenRouter failed ({e}). Falling back to native Gemini SDK.")
            try:
                import google.generativeai as genai
                import asyncio
                genai.configure(api_key=gemini_key.strip())
                gemini_model = genai.GenerativeModel('gemini-2.0-flash')  # Using 2.0-flash which is widely available
                
                def run_gemini():
                    resp = gemini_model.generate_content(prompt, generation_config=genai.types.GenerationConfig(temperature=temperature))
                    return resp.text
                
                result = await asyncio.to_thread(run_gemini)
                return result
            except Exception as gemini_e:
                logger.warning(f"Native Gemini fallback also failed: {gemini_e}")
                raise RuntimeError(f"OpenRouter failed ({e}) and Gemini fallback failed ({gemini_e})")
        raise


async def call_nvidia_vision(
    image_base64: str,
    *,
    prompt: str,
    model: str,
    timeout: float = 40.0,
    max_tokens: int = 2500,
    temperature: float = 0.1,
) -> str:
    """Call NVIDIA API for vision analysis."""
    api_key = os.getenv("NVIDIA_API_KEY", "").strip()
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
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}},
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


async def call_vision_model(
    image_base64: str,
    *,
    prompt: str,
    model: str,
    timeout: float = 40.0,
    max_tokens: int = 2500,
    temperature: float = 0.1,
) -> str:
    """
    Call vision model with fallback chain:
    1. NVIDIA API (if configured)
    2. OpenRouter (if configured)
    3. Gemini SDK (fallback)
    """
    from core.logger import logger
    
    # Try NVIDIA first if key is available
    nvidia_key = os.getenv("NVIDIA_API_KEY", "").strip()
    if nvidia_key:
        nvidia_model = os.getenv("NVIDIA_VISION_MODEL", "meta/llama-3.2-90b-vision-instruct")
        try:
            logger.info(f"Trying NVIDIA vision model: {nvidia_model}")
            result = await call_nvidia_vision(
                image_base64,
                prompt=prompt,
                model=nvidia_model,
                timeout=timeout,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            logger.info("NVIDIA vision model succeeded")
            return result
        except Exception as e:
            logger.warning(f"NVIDIA vision failed: {e}. Trying OpenRouter...")
    
    # Fall back to OpenRouter
    openrouter_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if openrouter_key:
        try:
            logger.info(f"Trying OpenRouter vision model: {model}")
            result = await call_openrouter(
                [{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}},
                    ],
                }],
                model,
                timeout=timeout,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            logger.info("OpenRouter vision model succeeded")
            return result
        except Exception as e:
            logger.warning(f"OpenRouter vision failed: {e}. Trying Gemini fallback...")
    
    # Final fallback to Gemini
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    if gemini_key:
        try:
            logger.info("Trying Gemini vision fallback")
            import google.generativeai as genai
            import asyncio
            
            genai.configure(api_key=gemini_key)
            gemini_model = genai.GenerativeModel('gemini-1.5-flash')
            
            # Decode base64 image
            import base64
            from io import BytesIO
            
            image_data = base64.b64decode(image_base64)
            image_parts = [
                {"mime_type": "image/jpeg", "data": image_data}
            ]
            
            def run_gemini_vision():
                response = gemini_model.generate_content(
                    [prompt] + image_parts,
                    generation_config=genai.types.GenerationConfig(temperature=temperature, max_output_tokens=max_tokens)
                )
                return response.text
            
            result = await asyncio.to_thread(run_gemini_vision)
            logger.info("Gemini vision fallback succeeded")
            return result
        except Exception as e:
            logger.error(f"All vision providers failed. Last error (Gemini): {e}")
            raise RuntimeError(f"All vision models failed. Last error: {e}")
    
    raise RuntimeError("No vision API keys configured (NVIDIA_API_KEY, OPENROUTER_API_KEY, or GEMINI_API_KEY)")
