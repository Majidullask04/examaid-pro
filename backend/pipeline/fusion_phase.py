"""
Phase 3: ANALYSIS — RAG Mapper
Maps syllabus topics against free web-retrieval results using one OpenRouter model.
Falls back to lexical scoring if no model key is available.
"""
import json
import os
import re

from core.logger import logger
from services.openrouter_client import call_text_model, has_openrouter_key


ANALYSIS_MODEL = os.getenv("PIPELINE_ANALYSIS_MODEL", "z-ai/glm-4.5-air:free")


def _parse_syllabus_topics(syllabus_text: str) -> list[dict]:
    topics = []
    current_unit = 1

    for line in syllabus_text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue

        unit_match = re.match(r"UNIT\s+(\d+):", stripped, re.IGNORECASE)
        if unit_match:
            current_unit = int(unit_match.group(1))
            continue

        if stripped.startswith("- "):
            topic_name = stripped[2:].strip()
            if topic_name:
                topics.append({"topic": topic_name, "unit": current_unit})

    return topics


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").lower()).strip()


def _infer_marks_potential(topic: str, score: int) -> str:
    lowered = topic.lower()
    if any(keyword in lowered for keyword in ("algorithm", "architecture", "management", "design", "scheduling", "replacement")):
        return "10"
    if any(keyword in lowered for keyword in ("definition", "state", "types", "function", "advantage", "calls")):
        return "2"
    return "10" if score >= 70 else "5"


def _score_topic(topic: str, corpus: str) -> tuple[int, str, str]:
    normalized_topic = _normalize(topic)
    if not normalized_topic:
        return 20, "DORMANT", "No searchable wording available"

    exact_hits = corpus.count(normalized_topic)
    topic_tokens = [token for token in normalized_topic.split(" ") if len(token) > 2]
    matched_tokens = sum(1 for token in topic_tokens if token in corpus)

    if exact_hits >= 2 or (exact_hits >= 1 and matched_tokens >= max(2, len(topic_tokens) - 1)):
        return 90, "LOCKED", "Matched strongly in retrieved question-bank text"
    if exact_hits == 1 or matched_tokens >= 2:
        return 65, "LIKELY", "Topic tokens appeared in retrieved exam resources"
    if matched_tokens == 1:
        return 40, "POSSIBLE", "Partial token overlap found in retrieved sources"
    return 20, "DORMANT", "Not surfaced in retrieved sources"


def _fallback_fusion(search_data: dict, syllabus_text: str) -> list:
    syllabus_topics = _parse_syllabus_topics(syllabus_text)
    corpus = _normalize(search_data.get("raw_text", ""))

    fused_topics = []
    for entry in syllabus_topics:
        score, consistency, evidence = _score_topic(entry["topic"], corpus)
        fused_topics.append({
            "topic": entry["topic"],
            "unit": entry["unit"],
            "frequency_score": score,
            "consistency": consistency,
            "marks_potential": _infer_marks_potential(entry["topic"], score),
            "importance": "CRITICAL" if score >= 80 else "HIGH" if score >= 55 else "MEDIUM" if score >= 35 else "LOW",
            "exam_tip": evidence,
        })

    logger.info(f"✅ Phase 3 ANALYSIS (fallback): {len(fused_topics)} syllabus topics mapped lexically")
    return fused_topics


async def run_fusion_phase(syllabus_text: str, search_data: dict) -> tuple[list, str]:
    """
    Uses OpenRouter to map messy retrieved documents back onto syllabus topics.
    Returns (virtual_index, mode).
    """
    raw_search_text = (search_data.get("raw_text") or "").strip()
    if not has_openrouter_key():
        logger.warning("OPENROUTER_API_KEY not set — analysis phase using lexical fallback")
        return _fallback_fusion(search_data, syllabus_text), "fallback"

    syllabus_topics = _parse_syllabus_topics(syllabus_text)
    if not syllabus_topics:
        return [], "fallback"

    retrieval_text = raw_search_text or "No retrieved search text available. Use only the syllabus structure."
    retrieval_text = retrieval_text[:15000]

    prompt = f"""You are a JNTUH R22 topic-mapping engine.

SYLLABUS TOPICS:
{json.dumps(syllabus_topics, indent=2)}

RETRIEVED EXAM RESOURCE TEXT:
{retrieval_text}

TASK:
- For every syllabus topic, decide how strongly it appears in the retrieved exam-resource text.
- Keep the original topic names and unit numbers.
- Assign:
  - frequency_score: 0-100
  - consistency: LOCKED | LIKELY | POSSIBLE | DORMANT
  - marks_potential: 2 | 5 | 10
  - importance: CRITICAL | HIGH | MEDIUM | LOW
  - exam_tip: one sentence explaining the signal

RULES:
- If a topic is clearly repeated or directly mentioned in important-question text, score it high.
- If the evidence is weak or indirect, keep it conservative.
- If the topic is not mentioned at all, score it low rather than inventing confidence.
- Return a JSON array only. No markdown.

OUTPUT FORMAT:
[
  {{
    "topic": "Process Synchronization",
    "unit": 2,
    "frequency_score": 82,
    "consistency": "LOCKED",
    "marks_potential": "10",
    "importance": "CRITICAL",
    "exam_tip": "Directly mentioned in retrieved important-question text."
  }}
]"""

    try:
        content = await call_text_model(
            prompt,
            ANALYSIS_MODEL,
            timeout=35.0,
            max_tokens=6000,
            temperature=0.0,
        )
        cleaned = content.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
            cleaned = cleaned.strip()

        parsed = json.loads(cleaned)
        if isinstance(parsed, dict) and "topics" in parsed:
            parsed = parsed["topics"]

        if isinstance(parsed, list):
            logger.info(f"✅ Phase 3 ANALYSIS complete: {len(parsed)} topics mapped with {ANALYSIS_MODEL}")
            return parsed, "live"
    except Exception as exc:
        logger.warning(f"Phase 3 ANALYSIS model failed, using fallback: {exc}")

    return _fallback_fusion(search_data, syllabus_text), "fallback"
