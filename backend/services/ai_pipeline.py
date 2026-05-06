import os
import json
from core.logger import logger, track_execution_time
from schemas import AnalysisResult, FormattedAnswer
from services.openrouter_client import call_openrouter

# Shared OpenRouter models
QWEN_MODEL = os.getenv("OPENROUTER_CHAT_MODEL", "qwen/qwen-2.5-7b-instruct:free")
ZLM_MODEL = os.getenv("OPENROUTER_REASONING_MODEL", "z-ai/glm-4.5-air:free")

async def call_llm(messages: list, model: str, force_json: bool = False) -> str:
    return await call_openrouter(
        messages,
        model,
        timeout=10.0,
        max_tokens=1800,
        temperature=0.1,
        response_format={"type": "json_object"} if force_json else None,
    )


@track_execution_time
async def qwen_analysis(text: str) -> AnalysisResult:
    """
    Step 2: Analysis Layer
    """
    prompt = f"""
    Analyze this question for JNTUH exam. Extract the topic, guess the marks (mostly 10-mark for essays), and identify 3 key concepts.
    You MUST return strict JSON format:
    {{"topic": "string", "type": "string", "keywords": ["string"]}}
    
    Question: {text}
    """
    
    try:
        response = await call_llm([{"role": "user", "content": prompt}], QWEN_MODEL, force_json=True)
        # Parse output ensuring it matches schema
        data = json.loads(response)
        return AnalysisResult(**data)
    except Exception as e:
        logger.error(f"Analysis layer failed: {e}")
        # Fallback empty analysis
        return AnalysisResult(topic="Unknown", type="10-mark", keywords=[])


@track_execution_time
async def zlm_generate(text: str, analysis: AnalysisResult) -> str:
    """
    Step 3: Generation Layer (with Qwen fallback)
    """
    prompt = f"""
    Generate a JNTUH {analysis.type} answer for the topic "{analysis.topic}".
    Ensure you cover these keywords: {", ".join(analysis.keywords)}.
    
    Question: {text}
    """
    
    try:
        # Try primary reasoning model first
        return await call_llm([{"role": "user", "content": prompt}], ZLM_MODEL)
    except Exception as e:
        logger.warning(f"Reasoning generation failed, falling back to chat model: {e}")
        try:
            return await call_llm([{"role": "user", "content": prompt}], QWEN_MODEL)
        except Exception as e2:
            logger.error(f"Complete generation failure: {e2}")
            return "Answer generation failed."

@track_execution_time
async def format_answer(answer_text: str) -> dict:
    """
    Step 4: Formatter Layer. 
    Forces the raw LLM string into strict structured JSON format.
    """
    prompt = f"""
    Convert the following answer text into this exact JSON structure:
    {{
      "introduction": "string",
      "body": "string",
      "diagram": "string (textual description if any)",
      "conclusion": "string"
    }}
    
    Text to format:
    {answer_text}
    """
    
    try:
        response = await call_llm([{"role": "user", "content": prompt}], QWEN_MODEL, force_json=True)
        
        data = json.loads(response)
        
        # Enforce exactly the keys expected via Pydantic model
        validated = FormattedAnswer(
            introduction=data.get("introduction", "Introduction not found"),
            body=data.get("body", "Body not found"),
            diagram=data.get("diagram", "No diagram"),
            conclusion=data.get("conclusion", "Conclusion not found")
        )
        
        return validated.model_dump()
    except Exception as e:
        logger.error(f"Formatting failed: {e}")
        # Return fallback strict JSON
        return {
            "introduction": "Formatting failed",
            "body": answer_text,
            "diagram": "",
            "conclusion": ""
        }
