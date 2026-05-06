"""
MVP AI service.

This is the single active AI entrypoint for exam answers. It calls Gemini
directly, validates the structured response, and hides provider errors from
students behind one friendly retry message.
"""
import asyncio
import json
import os
import re
from typing import Any, Literal

import httpx
from pydantic import BaseModel, Field, ValidationError


class StructuredAnswer(BaseModel):
    title: str = ""
    definition: str = ""
    important_points: list[str] = Field(default_factory=list)
    exam_answer: str = ""


class AIAnswerRequest(BaseModel):
    question: str
    context: str | None = None
    mode: Literal["explain", "deep", "summary", "chat"] = "explain"


class TemporaryAIError(RuntimeError):
    pass


GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
GEMINI_API_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent"
)


def _gemini_key() -> str:
    return os.getenv("GEMINI_API_KEY", "").strip()


def has_ai_key() -> bool:
    return bool(_gemini_key())


def _build_prompt(request: AIAnswerRequest) -> str:
    if request.mode == "summary":
        task = "Create compact revision notes from the provided questions and answers."
    elif request.mode == "deep":
        task = "Teach this topic clearly and include the details that help score marks."
    elif request.mode == "chat":
        task = "Answer the student's exam-preparation question clearly and practically."
    else:
        task = "Explain this as an exam-ready answer."

    context = f"\nContext:\n{request.context}" if request.context else ""

    return f"""
You are a JNTUH exam preparation assistant.

Task:
{task}

Question:
{request.question}
{context}

Return ONLY valid JSON in this exact shape:
{{
  "title": "short title",
  "definition": "brief definition or direct opening",
  "important_points": ["point 1", "point 2", "point 3"],
  "exam_answer": "exam-ready answer written in clear paragraphs"
}}

Rules:
- Do not include markdown fences.
- Keep important_points as short strings.
- exam_answer must be useful even if definition is empty.
- Never mention API keys, providers, or backend errors.
""".strip()


def _extract_json(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    fence_match = re.search(r"```(?:json)?\s*(.*?)```", cleaned, re.DOTALL | re.IGNORECASE)
    if fence_match:
        cleaned = fence_match.group(1).strip()

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found")

    return json.loads(cleaned[start:end + 1])


def _validate_answer(payload: dict[str, Any]) -> StructuredAnswer:
    answer = StructuredAnswer.model_validate(payload)
    has_content = bool(answer.exam_answer.strip() or answer.definition.strip() or answer.important_points)
    if not has_content:
        raise ValueError("Incomplete AI answer")
    return answer


async def generate_structured_answer(request: AIAnswerRequest, retries: int = 2) -> StructuredAnswer:
    api_key = _gemini_key()
    if not api_key:
        raise TemporaryAIError("Temporary AI issue. Please retry.")

    prompt = _build_prompt(request)
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 1400,
            "responseMimeType": "application/json",
        },
    }

    last_error: Exception | None = None

    for attempt in range(retries + 1):
        try:
            async with httpx.AsyncClient(timeout=18.0) as client:
                response = await client.post(
                    GEMINI_API_URL,
                    params={"key": api_key},
                    json=payload,
                )
                response.raise_for_status()

            data = response.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            return _validate_answer(_extract_json(text))
        except (httpx.TimeoutException, httpx.HTTPError, KeyError, IndexError, json.JSONDecodeError, ValidationError, ValueError) as exc:
            last_error = exc
            if attempt < retries:
                await asyncio.sleep(0.6 * (attempt + 1))
                continue

    raise TemporaryAIError("Temporary AI issue. Please retry.") from last_error


def answer_to_markdown(answer: StructuredAnswer) -> str:
    sections: list[str] = []
    if answer.title:
        sections.append(f"### {answer.title}")
    if answer.definition:
        sections.append(f"**Definition:** {answer.definition}")
    if answer.important_points:
        points = "\n".join(f"- {point}" for point in answer.important_points)
        sections.append(f"**Important Points:**\n{points}")
    if answer.exam_answer:
        sections.append(f"**Exam Answer:**\n{answer.exam_answer}")
    return "\n\n".join(sections)
