"""
ExamHelper R22 — FastAPI Backend (Revised Architecture)

ROUTING TABLE:
  Study Plan  → Pre-computed index + Strategy → Cache → JSON  (NO LLM)
  Subjects    → SQLite                                        (NO LLM)
  Explain     → OpenRouter free chat model                    (LLM)
  OCR         → OpenRouter vision / local fallback            (LLM)
  PDF         → Abstract renderer (FPDF2 local / WeasyPrint prod)
  Admin       → Data entry + index rebuild endpoints

data_confidence flows through every response:
  "none"    → syllabus structure only, no question data
  "partial" → some papers analyzed
  "full"    → 5+ years of papers
"""
import os
import sys
import json
from pathlib import Path
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Optional, List, Literal
from urllib.parse import quote_plus

from fastapi import FastAPI, HTTPException, Header, Query
from fastapi.responses import Response, JSONResponse, StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent
ROOT_DIR = BACKEND_DIR.parent
load_dotenv(ROOT_DIR / ".env")
load_dotenv(BACKEND_DIR / ".env", override=True)
sys.path.insert(0, os.path.dirname(__file__))

from core.logger import logger
from core.cache import cache
from core.error_handler import error_handler
from bootstrap import ApplicationBootstrap
from data.models import SessionLocal, Subject, Question, TopicIndexEntry
from data.frequency_engine import frequency_index
from strategies.pass_strategy import PassOnlyStrategy
from strategies.high_marks_strategy import HighMarksStrategy
from services.pdf_renderer import get_pdf_renderer
from services.openrouter_client import call_vision_model
from services.ai_service import (
    AIAnswerRequest,
    TemporaryAIError,
    answer_to_markdown,
    generate_structured_answer,
)
from api.v2_routes import router as v2_router

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
ADMIN_KEY = os.getenv("ADMIN_KEY", "examhelper_admin_2025")
QUEEN_MODEL = os.getenv("OPENROUTER_CHAT_MODEL", "qwen/qwen-2.5-7b-instruct:free")
ZLM_MODEL = os.getenv("OPENROUTER_REASONING_MODEL", "z-ai/glm-4.5-air:free")
# Advanced OCR/search routing is parked for later. The active MVP AI path is
# services/ai_service.py -> Gemini structured JSON.
FRONTEND_DIST = ROOT_DIR / "dist"

pass_strategy = PassOnlyStrategy()
high_marks_strategy = HighMarksStrategy()


# ─── Startup ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    ApplicationBootstrap().run()
    yield
    logger.info("Backend shutting down.")


app = FastAPI(title="ExamHelper R22 Intelligence API", lifespan=lifespan)

# Include V2 API routes (Enhanced Prediction Engine)
app.include_router(v2_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Helper: call OpenRouter LLM ─────────────────────────────────────────────
async def call_llm(messages: list, model: str, timeout: float = 10.0) -> str:
    import httpx
    import asyncio
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://knightsky.dpdns.org",
        "X-Title": "ExamHelper R22",
    }
    body = {"model": model, "messages": messages, "max_tokens": 1500}
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            for attempt in range(3):
                resp = await client.post("https://openrouter.ai/api/v1/chat/completions", json=body, headers=headers)
                if resp.status_code == 429 and attempt < 2:
                    await asyncio.sleep(2)
                    continue
                resp.raise_for_status()
                return resp.json()["choices"][0]["message"]["content"]
    except httpx.TimeoutException:
        raise TimeoutError("LLM call timed out")
    except Exception as e:
        raise RuntimeError(f"LLM call failed: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
#  LIVE SYNTHESIS PIPELINE (SSE Streaming)
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/api/analyze/stream/{subject_code}/{goal}")
async def analyze_stream(subject_code: str, goal: str = "pass"):
    """
    THE CORE ENDPOINT — 5-phase agentic pipeline streamed via SSE.
    
    Phase 1: VISION   → load syllabus structure / image OCR
    Phase 2: SEARCH   → free DuckDuckGo retrieval
    Phase 3: ANALYSIS → OpenRouter RAG mapping
    Phase 4: BRAIN    → deterministic local strategy
    Phase 5: PREP     → deterministic PDF formatter

    Result cached for 7 days. Second request costs $0.00.
    Frontend reads via EventSource for real-time progress animation.
    """
    from pipeline.orchestrator import run_pipeline_stream

    async def event_generator():
        async for event in run_pipeline_stream(subject_code, goal):
            yield event

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/pdf/text")
async def generate_pdf_from_text(data: dict):
    """
    Generates PDF from the text block produced by Phase 5 PREP.
    This is the clean text-to-PDF path — no JSON parsing needed.
    """
    from fpdf import FPDF

    subject_name = data.get("subject_name", "Study Guide")
    goal = data.get("goal", "pass")
    pdf_text = data.get("pdf_text", "")
    plan = data.get("plan", {})

    if not pdf_text and plan:
        # Fallback: generate text from plan
        from pipeline.prep_phase import _manual_format
        pdf_text = _manual_format(plan, subject_name)

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # Title header
    pdf.set_fill_color(30, 58, 95)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 12, _safe("ExamHelper R22 Study Guide"), new_x="LMARGIN", new_y="NEXT", align="C", fill=True)
    pdf.ln(2)

    pdf.set_fill_color(245, 245, 245)
    pdf.set_text_color(30, 30, 30)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, _safe(f"Subject: {subject_name}"), new_x="LMARGIN", new_y="NEXT", fill=True)

    goal_display = plan.get("meta", {}).get("goal_display", "") or ("Just Pass" if goal == "pass" else "High Marks")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, _safe(f"Strategy: {goal_display}"), new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, _safe(f"Generated: {data.get('generated_at', '')[:10]} | Source: Live AI Synthesis"), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    # Separator
    pdf.set_draw_color(200, 200, 200)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)

    # Parse the text block line by line
    lines = pdf_text.split("\n")
    for line in lines:
        line = line.strip()
        if not line:
            pdf.ln(2)
            continue

        # Unit headers
        if line.startswith("=== UNIT") or line.startswith("UNIT"):
            pdf.ln(3)
            pdf.set_font("Helvetica", "B", 12)
            pdf.set_text_color(5, 150, 105)  # Green
            pdf.multi_cell(0, 7, _safe(line.replace("===", "").strip()))
        # Must study header
        elif line.startswith("MUST STUDY"):
            pdf.set_font("Helvetica", "B", 10)
            pdf.set_text_color(0, 0, 0)
            pdf.cell(0, 6, _safe(line), new_x="LMARGIN", new_y="NEXT")
        # Must study topics (+ prefix)
        elif line.startswith("+ "):
            pdf.set_font("Helvetica", "", 10)
            pdf.set_text_color(30, 30, 30)
            pdf.multi_cell(0, 5, _safe(line))
        # Exam tips (-> prefix)
        elif line.startswith("-> ") or line.startswith("  ->"):
            pdf.set_font("Helvetica", "I", 9)
            pdf.set_text_color(80, 80, 80)
            pdf.multi_cell(0, 4, _safe(line))
        # Skip header
        elif line.startswith("SKIP"):
            pdf.set_font("Helvetica", "B", 10)
            pdf.set_text_color(150, 150, 150)
            pdf.cell(0, 6, _safe(line), new_x="LMARGIN", new_y="NEXT")
        # Skip topics (x prefix)
        elif line.startswith("x "):
            pdf.set_font("Helvetica", "", 9)
            pdf.set_text_color(150, 150, 150)
            pdf.multi_cell(0, 5, _safe(line))
        # Separator
        elif line == "---" or line.startswith("==="):
            pdf.set_draw_color(220, 220, 220)
            pdf.line(10, pdf.get_y(), 200, pdf.get_y())
            pdf.ln(2)
        # Strategy section
        elif line.startswith("EXAM DAY") or line.startswith("TOTAL:"):
            pdf.set_font("Helvetica", "B", 11)
            pdf.set_text_color(30, 58, 95)
            pdf.multi_cell(0, 6, _safe(line))
        # Default text
        else:
            pdf.set_font("Helvetica", "", 10)
            pdf.set_text_color(50, 50, 50)
            pdf.multi_cell(0, 5, _safe(line))

    pdf_bytes = pdf.output()
    filename = f"R22_{subject_name.replace(' ', '_')}_{goal.upper()}_Guide.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _safe(text: str) -> str:
    """Encode text for FPDF (latin-1 safe)."""
    return text.encode("latin-1", "replace").decode("latin-1")


class AIMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class AIStreamRequest(BaseModel):
    messages: List[AIMessage]
    model: str = QUEEN_MODEL
    max_tokens: int = 1500


async def stream_structured_ai_answer(request: AIStreamRequest):
    """Compatibility SSE wrapper around the MVP Gemini JSON answer service."""
    user_messages = [message.content for message in request.messages if message.role == "user"]
    question = user_messages[-1] if user_messages else ""
    context = "\n\n".join(user_messages[:-1]) if len(user_messages) > 1 else None

    try:
        answer = await generate_structured_answer(
            AIAnswerRequest(question=question, context=context, mode="chat")
        )
        content = answer_to_markdown(answer)
    except TemporaryAIError:
        content = "Temporary AI issue. Please retry."

    payload = {"choices": [{"delta": {"content": content}}]}
    yield f"data: {json.dumps(payload)}\n\n"
    yield "data: [DONE]\n\n"


class ResourceRequest(BaseModel):
    topic: str
    context: Optional[str] = None


class SyllabusAnalysisRequest(BaseModel):
    image_base64: str
    department: str
    goal: Literal["pass", "high_marks"] = "high_marks"
    panic_mode: bool = False


def _extract_subject_hint(text: str) -> str | None:
    import re

    patterns = [
        r"Subject[:\s]+([A-Za-z0-9\s&()/-]+?)(?:\n|,|\.|$)",
        r"SUBJECT NAME[:\s]+([A-Za-z0-9\s&()/-]+?)(?:\n|,|\.|$)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match and match.group(1).strip():
            return match.group(1).strip()
    return None


async def stream_llm(messages: list, model: str = QUEEN_MODEL, max_tokens: int = 1500):
    import httpx

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://knightsky.dpdns.org",
        "X-Title": "ExamHelper R22",
    }
    body = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "stream": True,
    }

    try:
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream(
                "POST",
                "https://openrouter.ai/api/v1/chat/completions",
                json=body,
                headers=headers,
            ) as response:
                response.raise_for_status()
                async for chunk in response.aiter_text():
                    if chunk:
                        yield chunk
    except Exception as exc:
        logger.error(f"LLM streaming failed: {exc}")
        payload = {
            "choices": [
                {
                    "delta": {
                        "content": "Unable to complete the AI request right now. Please try again shortly."
                    }
                }
            ]
        }
        yield f"data: {json.dumps(payload)}\n\n"
        yield "data: [DONE]\n\n"


def build_learning_path(topic: str, context: Optional[str] = None) -> str:
    lines = [
        f"Start with the definition and core purpose of {topic}.",
        f"Break {topic} into 3-4 subtopics and study one example for each.",
        "Practice the standard exam-style questions, then write a short revision sheet in your own words.",
        "Finish by solving one previous-paper question and timing yourself."
    ]
    if context:
        lines.insert(2, f"Use this context while revising: {context[:140]}.")
    return "\n".join(f"- {line}" for line in lines)


def build_resource_links(topic: str):
    query = quote_plus(topic)
    exam_query = quote_plus(f"{topic} JNTUH")
    return {
        "videos": [
            {
                "title": f"{topic} crash course videos",
                "url": f"https://www.youtube.com/results?search_query={exam_query}",
                "source": "YouTube",
                "description": "Quick concept explainers and last-minute revision videos.",
            },
            {
                "title": f"{topic} solved examples",
                "url": f"https://www.youtube.com/results?search_query={quote_plus(f'{topic} solved problems')}",
                "source": "YouTube",
                "description": "Worked examples to understand how answers are written in exams.",
            },
            {
                "title": f"{topic} full playlist",
                "url": f"https://www.youtube.com/results?search_query={quote_plus(f'{topic} playlist')}",
                "source": "YouTube",
                "description": "Long-form playlists if you want a complete walkthrough.",
            },
        ],
        "articles": [
            {
                "title": f"Search GeeksforGeeks for {topic}",
                "url": f"https://www.google.com/search?q=site%3Ageeksforgeeks.org+{query}",
                "source": "GeeksforGeeks",
                "description": "Concept-first articles and examples for technical topics.",
            },
            {
                "title": f"Search TutorialsPoint for {topic}",
                "url": f"https://www.google.com/search?q=site%3Atutorialspoint.com+{query}",
                "source": "TutorialsPoint",
                "description": "Step-by-step explanations with simple structure.",
            },
            {
                "title": f"Search Wikipedia for {topic}",
                "url": f"https://www.google.com/search?q=site%3Awikipedia.org+{query}",
                "source": "Wikipedia",
                "description": "Good for quick definitions and high-level background.",
            },
            {
                "title": f"Search Javatpoint for {topic}",
                "url": f"https://www.google.com/search?q=site%3Ajavatpoint.com+{query}",
                "source": "Javatpoint",
                "description": "Useful when you want concise notes and examples.",
            },
        ],
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  PUBLIC ENDPOINTS (existing)
# ═══════════════════════════════════════════════════════════════════════════════


@app.get("/api/subjects/{branch}")
async def get_subjects(branch: str):
    """Returns subjects from SQLite for the given branch."""
    db = SessionLocal()
    try:
        subjects = db.query(Subject).filter_by(branch=branch.upper()).all()
        subjects = sorted(
            [s for s in subjects if not s.subject_code.startswith("R22CS")],
            key=lambda s: s.subject_code,
        )
        result = {
            "subjects": [
                {"id": s.subject_code, "name": s.subject_name, "code": s.subject_code}
                for s in subjects
            ]
        }
        if not subjects and branch.upper() not in ("CSE",):
            result["warning"] = f"Currently optimized for CSE. Results for {branch} may vary."
        return result
    finally:
        db.close()


@app.post("/api/ai/stream")
async def ai_stream(request: AIStreamRequest):
    """Stream MVP exam answers through the single active AI service."""
    return StreamingResponse(
        stream_structured_ai_answer(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/ai/answer")
async def ai_answer(request: AIAnswerRequest):
    """Return a structured exam answer for predictable React rendering."""
    try:
        answer = await generate_structured_answer(request)
        return answer.model_dump()
    except TemporaryAIError:
        raise HTTPException(status_code=503, detail="Temporary AI issue. Please retry.")


@app.post("/api/resources")
async def get_resources(request: ResourceRequest):
    """Return safe learning-resource links plus a short learning plan."""
    topic = request.topic.strip()
    if not topic:
        raise HTTPException(status_code=400, detail="Topic is required")

    resources = build_resource_links(topic)
    learning_path = build_learning_path(topic, request.context)

    if OPENROUTER_API_KEY:
        prompt = f"""Create a concise markdown bullet learning path for a student studying "{topic}" for an exam.

Context:
{request.context or "No extra context provided."}

Rules:
- 4 bullets maximum
- focus on study order
- mention what to revise last
- no intro paragraph"""
        try:
            learning_path = await call_llm(
                [{"role": "user", "content": prompt}],
                QUEEN_MODEL,
                timeout=8.0,
            )
        except Exception as exc:
            logger.warning(f"Resource learning path fallback used: {exc}")

    return {
        "videos": resources["videos"],
        "articles": resources["articles"],
        "learningPath": learning_path,
        "citations": [],
    }


@app.post("/api/syllabus/analyze")
async def analyze_syllabus(request: SyllabusAnalysisRequest):
    """Analyze a syllabus image via the backend so the browser never needs the API key."""
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=503, detail="Temporary AI issue. Please retry.")

    prompt = (
        "You are an expert JNTUH syllabus reader. Read the uploaded syllabus image and produce a practical study summary. "
        f"Department: {request.department}. Goal: {request.goal}. Panic mode: {request.panic_mode}. "
        "Identify the subject if visible, summarize the units, mention likely focus areas, and keep the output clear and exam-oriented. "
        "Start one line with 'Subject:' if you can identify it."
    )

    analysis = await call_vision_model(
        request.image_base64,
        prompt=prompt,
        model=os.getenv("PIPELINE_VISION_MODEL", "nvidia/nemotron-nano-12b-v2-vl:free"),
        timeout=40.0,
        max_tokens=2500,
    )

    return {"analysis": analysis, "subject_hint": _extract_subject_hint(analysis)}


@app.get("/api/study-plan/{subject_code}/{goal}")
async def get_study_plan(subject_code: str, goal: str = "pass"):
    """
    Returns pre-computed study plan. Cache first → strategy algorithm → SQLite.
    NO LLMs called. 85%+ of requests served from cache.
    """
    # L3 Cache check
    cached = cache.get_study_plan(subject_code, goal)
    if cached:
        cached["meta"]["cache_hit"] = True
        return cached

    db = SessionLocal()
    try:
        subject = db.query(Subject).filter_by(subject_code=subject_code).first()
        if not subject:
            return JSONResponse(status_code=404, content=error_handler.handle("subject_not_found", {"code": subject_code}))
    finally:
        db.close()

    # Load frequency index (may be all NO_DATA)
    index = frequency_index.get_index(subject_code)
    data_confidence = frequency_index.get_data_confidence(subject_code)
    question_count = frequency_index.get_question_count(subject_code)

    # Run strategy
    if goal == "pass":
        plan_data = pass_strategy.generate_plan(index)
    else:
        plan_data = high_marks_strategy.generate_plan(index)

    has_data = plan_data.get("has_data", False)
    all_topics = list(index.values())

    # Build summary
    if has_data:
        study_topics = [t for t in all_topics if t.get("consistency") in ("LOCKED", "LIKELY") or (t.get("frequency_score") or 0) >= 50]
        skip_topics = [t for t in all_topics if t not in study_topics]
        priority_units = sorted(set(
            t["unit"] for t in study_topics if (t.get("frequency_score") or 0) >= 60
        ))[:3]
        locked_topics = [t for t in all_topics if t.get("consistency") == "LOCKED" and t.get("guaranteed_2mark")]
        exp_total = plan_data.get("total_expected_marks") or 0
        exp_range = [max(0, int(exp_total - 5)), int(exp_total + 8)]
    else:
        study_topics = all_topics
        skip_topics = []
        priority_units = [1, 2, 3]
        locked_topics = []
        exp_range = [None, None]

    # Warnings (only when we have data)
    warnings = []
    if has_data:
        rising = [t for t in all_topics if t.get("trend") == "RISING" and (t.get("frequency_score") or 0) >= 50]
        for t in rising[:2]:
            warnings.append(f"'{t['topic']}' has RISING trend — marks increasing.")
        dormant = [t for t in all_topics if t.get("consistency") == "DORMANT" and t.get("last_seen_year") and (2024 - t["last_seen_year"]) >= 2]
        for t in dormant[:1]:
            warnings.append(f"'{t['topic']}' dormant since {t['last_seen_year']} — may cycle back.")

    # Previous year questions (real data only)
    prev_questions = frequency_index.get_questions_for_subject(subject_code)
    pyq_grouped: dict = {}
    for q in prev_questions:
        key_exam = f"{q['year']}_{q['exam'].replace('/', '_')}"
        pyq_grouped.setdefault(key_exam, []).append(q)

    # Compute index_status
    if question_count == 0:
        index_status = "syllabus_only"
    elif question_count < 30:
        index_status = "partial_data"
    else:
        index_status = "full_5year"

    response = {
        "meta": {
            "subject_code": subject_code,
            "subject_name": subject.subject_name,
            "branch": subject.branch,
            "regulation": "R22",
            "generated_at": datetime.now().isoformat(),
            "goal": goal,
            "goal_display": plan_data["goal_display"],
            "model_used": "pre-computed",
            "cache_hit": False,
            "data_confidence": data_confidence,
            "papers_analyzed": len(set(f"{q['year']}_{q['exam']}" for q in prev_questions)),
            "index_status": index_status,
            "question_count": question_count,
            "last_index_rebuild": datetime.now().isoformat(),
        },
        "summary": {
            "total_topics_in_syllabus": len(all_topics),
            "topics_to_study": len(study_topics),
            "topics_to_skip": len(skip_topics),
            "expected_marks_range": exp_range,
            "study_time_estimate_hours": plan_data.get("total_study_hours", 0),
            "priority_units": priority_units,
            "confidence_level": plan_data.get("confidence", "none"),
            "guaranteed_marks_count": len(locked_topics),
        },
        "units": plan_data["units"],
        "exam_strategy": {
            "pass_strategy": {
                "golden_rule": "Answer ALL 2-mark questions + 2 out of 5 ten-mark questions = 30+ marks",
                "unit_selection": f"Focus on Units {', '.join(str(u) for u in (priority_units or [1,2,3]))}",
                "time_management": "2-mark: 3 min | 5-mark: 8 min | 10-mark: 15 min",
                "guaranteed_marks_topics_count": len(locked_topics),
                "guaranteed_marks_total": len(locked_topics) * 2,
            },
            "high_marks_strategy": {
                "golden_rule": "Master all LOCKED topics first, then LIKELY, then RISING",
                "unit_selection": "All 5 units. Priority units carry highest weightage.",
                "time_management": "Start with 10-mark topics you're most confident about.",
                "target_breakdown": {"2_mark": "14/15", "5_mark": "20/25", "10_mark": "30/35"},
            },
        },
        "warnings": warnings,
        "previous_year_questions": pyq_grouped,
    }

    # Cache for 24 hours
    cache.set_study_plan(subject_code, goal, response)
    return response


@app.get("/api/explain/{subject_code}/{topic}")
async def explain_topic(subject_code: str, topic: str):
    """Legacy topic explain endpoint. The active answer path is /api/ai/answer."""
    cached = cache.get_explanation(subject_code, topic)
    if cached:
        return cached

    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=503, detail="Temporary AI issue. Please retry.")

    index = frequency_index.get_index(subject_code)
    topic_data = index.get(topic, {})
    freq_context = ""
    if topic_data and topic_data.get("frequency_score") is not None:
        freq_context = (
            f"Frequency score: {topic_data['frequency_score']}/100. "
            f"Consistency: {topic_data['consistency']}. "
            f"Appearances: {topic_data['total_appearances']}x. Trend: {topic_data['trend']}."
        )

    prompt = f"""You are a JNTUH R22 exam prep expert. Explain for an exam answer.

Topic: {topic}
{f"Context: {freq_context}" if freq_context else ""}

Rules: Crisp exam-ready explanation. Definition + key points + ONE example. Max 300 words.

Format:
**Definition:** ...
**Key Points:** ...
**Example:** ...
**Exam Tip:** ..."""

    try:
        explanation = await call_llm([{"role": "user", "content": prompt}], QUEEN_MODEL, timeout=12.0)
        result = {"topic": topic, "explanation": explanation, "source": "legacy_text_model"}
    except (TimeoutError, RuntimeError):
        logger.warning(f"Legacy text model failed for '{topic}', trying fallback")
        try:
            explanation = await call_llm([{"role": "user", "content": prompt}], ZLM_MODEL, timeout=8.0)
            result = {"topic": topic, "explanation": explanation, "source": "legacy_fallback_model"}
        except Exception as e2:
            return JSONResponse(status_code=503, content=error_handler.handle("empty_ai_response"))

    cache.set_explanation(subject_code, topic, result)
    return result


class OCRRequest(BaseModel):
    content: str
    input_type: str = "image"


@app.post("/api/ocr")
async def ocr_image(request: OCRRequest):
    """Legacy OCR endpoint. Uses OpenRouter vision when configured, with a local fallback otherwise."""
    from services.ocr_service import perform_ocr

    raw_text = perform_ocr(request.content)
    source = "local_fallback"

    if OPENROUTER_API_KEY and request.input_type == "image":
        try:
            raw_text = await call_vision_model(
                request.content,
                prompt=(
                    "Extract all readable syllabus text from this image. "
                    "Return plain text only, preserving units, topic names, and numbering when visible."
                ),
                model=os.getenv("PIPELINE_VISION_MODEL", "nvidia/nemotron-nano-12b-v2-vl:free"),
                timeout=30.0,
            )
            source = "nvidia_or_openrouter_vision"
        except Exception as exc:
            logger.warning(f"Vision API failed, using local fallback: {exc}")

    if not OPENROUTER_API_KEY:
        return {"text": raw_text, "cleaned": False, "source": source}

    try:
        cleaned = await call_llm(
            [{"role": "user", "content": f"Clean up OCR text from a syllabus. Fix typos, remove noise, return cleaned topic names:\n\n{raw_text}"}],
            ZLM_MODEL, timeout=6.0
        )
        return {"text": cleaned, "raw_text": raw_text, "cleaned": True, "source": source}
    except Exception:
        return {"text": raw_text, "raw_text": raw_text, "cleaned": False, "source": source}


@app.post("/api/pdf")
async def generate_pdf(data: dict):
    """Generates PDF using abstract renderer. Toggle FPDF2/WeasyPrint via env."""
    try:
        renderer = get_pdf_renderer()
        pdf_bytes = renderer.render_study_plan(data)
        subject_name = data.get("meta", {}).get("subject_name", "Guide").replace(" ", "_")
        goal = data.get("meta", {}).get("goal", "plan")
        filename = f"R22_{subject_name}_{goal.upper()}_Guide.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        logger.error(f"PDF generation failed: {e}")
        return JSONResponse(status_code=500, content=error_handler.handle("pdf_generation_failed"))


# ═══════════════════════════════════════════════════════════════════════════════
#  ADMIN ENDPOINTS (data entry, not user-facing)
# ═══════════════════════════════════════════════════════════════════════════════


class QuestionInput(BaseModel):
    subject_code: str
    unit: int
    year: int
    exam: str               # "May" or "Nov"
    marks: int
    question_text: str
    topics: List[str]
    difficulty: str = "medium"
    question_type: str = "essay"


@app.post("/admin/questions")
async def add_question(question: QuestionInput, admin_key: str = Header(alias="X-Admin-Key", default="")):
    """Add a single real question to the bank."""
    if admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Unauthorized")

    db = SessionLocal()
    try:
        subject = db.query(Subject).filter_by(subject_code=question.subject_code).first()
        if not subject:
            raise HTTPException(status_code=404, detail=f"Subject {question.subject_code} not found")

        q_id = f"{question.subject_code}_{question.unit}_{question.year}_{question.exam}_{question.marks}m_{hash(question.question_text) % 10000}"
        existing = db.query(Question).filter_by(question_id=q_id).first()
        if existing:
            return {"status": "duplicate", "question_id": q_id}

        db.add(Question(
            question_id=q_id,
            subject_code=question.subject_code,
            subject_name=subject.subject_name,
            unit=question.unit,
            year=question.year,
            exam=question.exam,
            marks=question.marks,
            question_text=question.question_text,
            extracted_topics=question.topics,
            difficulty=question.difficulty,
            question_type=question.question_type,
        ))
        db.commit()

        # Invalidate cache for this subject
        cache.invalidate_study_plan(question.subject_code)

        return {"status": "added", "question_id": q_id}
    finally:
        db.close()


@app.post("/admin/questions/bulk")
async def bulk_import_questions(questions: List[QuestionInput], admin_key: str = Header(alias="X-Admin-Key", default="")):
    """Import multiple questions from JSON. Used when entering a full paper."""
    if admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Unauthorized")

    added = 0
    skipped = 0
    subject_codes = set()

    db = SessionLocal()
    try:
        for q in questions:
            subject = db.query(Subject).filter_by(subject_code=q.subject_code).first()
            if not subject:
                skipped += 1
                continue

            q_id = f"{q.subject_code}_{q.unit}_{q.year}_{q.exam}_{q.marks}m_{hash(q.question_text) % 10000}"
            if db.query(Question).filter_by(question_id=q_id).first():
                skipped += 1
                continue

            db.add(Question(
                question_id=q_id,
                subject_code=q.subject_code,
                subject_name=subject.subject_name,
                unit=q.unit,
                year=q.year,
                exam=q.exam,
                marks=q.marks,
                question_text=q.question_text,
                extracted_topics=q.topics,
                difficulty=q.difficulty,
                question_type=q.question_type,
            ))
            added += 1
            subject_codes.add(q.subject_code)

        db.commit()

        # Invalidate caches
        for code in subject_codes:
            cache.invalidate_study_plan(code)

        return {"status": "completed", "added": added, "skipped": skipped, "subjects_affected": list(subject_codes)}
    finally:
        db.close()


@app.post("/admin/index/rebuild")
async def rebuild_index(
    subject_code: Optional[str] = Query(None),
    admin_key: str = Header(alias="X-Admin-Key", default="")
):
    """Trigger frequency index rebuild. Rebuilds one subject or all."""
    if admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Unauthorized")

    db = SessionLocal()
    try:
        if subject_code:
            frequency_index.build_index(subject_code)
            cache.invalidate_study_plan(subject_code)
            return {"status": "rebuilt", "subject": subject_code}
        else:
            subjects = db.query(Subject).all()
            for s in subjects:
                frequency_index.build_index(s.subject_code)
                cache.invalidate_study_plan(s.subject_code)
            return {"status": "rebuilt_all", "count": len(subjects)}
    finally:
        db.close()


@app.get("/admin/stats")
async def admin_stats(admin_key: str = Header(alias="X-Admin-Key", default="")):
    """Dashboard stats for admin."""
    if admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Unauthorized")

    db = SessionLocal()
    try:
        subjects = db.query(Subject).count()
        questions = db.query(Question).count()
        index_entries = db.query(TopicIndexEntry).count()
        return {
            "subjects": subjects,
            "questions": questions,
            "index_entries": index_entries,
            "cache_type": "redis" if cache.is_connected() else "in-memory",
        }
    finally:
        db.close()


# ─── Legacy endpoint (backward compat) ────────────────────────────────────────
class LegacyRequest(BaseModel):
    input_type: str = "text"
    content: str


@app.post("/generate-answer")
async def generate_answer_legacy(request: LegacyRequest):
    """Legacy endpoint — routes to pre-computed pipeline if subject detected."""
    content_lower = request.content.lower()
    subject_map = {
        "data structures": "R22CS2201", "ds": "R22CS2201",
        "operating systems": "R22CS3302", "os": "R22CS3302",
        "database": "R22CS3301", "dbms": "R22CS3301",
        "computer networks": "R22CS3303", "cn": "R22CS3303",
        "computer organization": "R22CS2202", "coa": "R22CS2202",
    }
    for keyword, code in subject_map.items():
        if keyword in content_lower:
            goal = "pass" if "pass" in content_lower else "high_marks"
            return await get_study_plan(code, goal)

    if not OPENROUTER_API_KEY:
        return {"introduction": "Backend running. No OPENROUTER_API_KEY configured.", "body": "", "diagram": "", "conclusion": ""}

    try:
        answer = await call_llm(
            [{"role": "system", "content": "You are a JNTUH R22 exam prep expert."},
             {"role": "user", "content": request.content}],
            QUEEN_MODEL, timeout=15.0
        )
        parts = answer.split("\n\n")
        return {
            "introduction": parts[0] if parts else answer,
            "body": "\n\n".join(parts[1:-1]) if len(parts) > 2 else "",
            "diagram": None,
            "conclusion": parts[-1] if len(parts) > 1 else "",
        }
    except Exception as e:
        return error_handler.handle("empty_ai_response")


@app.get("/health")
async def health():
    return {"status": "ok", "pipeline": "active", "cache": "redis" if cache.is_connected() else "in-memory"}


@app.get("/{full_path:path}", include_in_schema=False)
async def serve_frontend(full_path: str):
    """Serve the built React app from FastAPI in production."""
    if not FRONTEND_DIST.exists():
        raise HTTPException(status_code=404, detail="Frontend build not found")

    requested_file = FRONTEND_DIST / full_path
    if full_path and requested_file.is_file():
        return FileResponse(requested_file)

    index_file = FRONTEND_DIST / "index.html"
    if index_file.exists():
        return FileResponse(index_file)

    raise HTTPException(status_code=404, detail="Frontend build not found")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
