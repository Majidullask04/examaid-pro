"""
Pipeline Orchestrator — SSE Streaming Engine
Chains the 5 phases and streams progress to the React frontend via Server-Sent Events.

"Compute Once, Serve Forever":
  First request triggers the 5-phase pipeline.
  Result cached in Redis/memory.
  Next 10,000 requests get cached result in <5ms for $0.00.
"""
import os
import sys
import json
import asyncio
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from core.logger import logger
from core.cache import cache
from data.seed_data import SYLLABUS_STRUCTURE, SUBJECTS
from data.frequency_engine import frequency_index
from strategies.pass_strategy import PassOnlyStrategy
from strategies.high_marks_strategy import HighMarksStrategy


pass_strategy = PassOnlyStrategy()
high_marks_strategy = HighMarksStrategy()


def _normalize_topic(topic: dict, *, default_priority: str = "MUST", skip_reason: str | None = None) -> dict:
    question_type = topic.get("question_type") or f"{topic.get('marks_potential', '5')}-mark answer"
    marks_potential = str(topic.get("marks_potential", ""))

    return {
        "name": topic.get("name") or topic.get("topic") or "Untitled topic",
        "priority": topic.get("priority", default_priority),
        "frequency_score": topic.get("frequency_score", 0),
        "consistency": topic.get("consistency", "POSSIBLE"),
        "trend": topic.get("trend", "STABLE"),
        "marks_history": topic.get("marks_history", []),
        "appeared_in": topic.get("appeared_in", "live synthesis"),
        "guaranteed": marks_potential == "2" or "2-mark" in question_type.lower(),
        "high_value": marks_potential == "10" or "10-mark" in question_type.lower(),
        "question_type": question_type,
        "what_to_focus_on": topic.get("what_to_focus_on", "Revise the core definition, structure, and one example."),
        "skip_reason": skip_reason or topic.get("skip_reason"),
    }


def _adapt_unit_for_ui(unit: dict, goal: str, data_confidence: str) -> dict:
    must_study = unit.get("must_study", [])
    skip_topics = unit.get("skip_topics", [])

    normalized_skip = [
        _normalize_topic(topic, default_priority="SKIP", skip_reason=topic.get("skip_reason", "Lower priority in the synthesized plan."))
        for topic in skip_topics
    ]

    if goal == "pass":
        two_mark = []
        should_study = []
        essay_topic = None

        for topic in must_study:
            normalized = _normalize_topic(topic)
            question_type = normalized["question_type"].lower()
            is_essay = normalized["high_value"] or "10-mark" in question_type or "essay" in question_type
            is_two_mark = normalized["guaranteed"] or "2-mark" in question_type or marks_potential_is(topic, "2")

            if is_essay and essay_topic is None:
                essay_topic = normalized
            elif is_two_mark:
                two_mark.append(normalized)
            else:
                should_study.append(normalized)

        if essay_topic is None and should_study:
            essay_topic = should_study[0]
            should_study = should_study[1:]

        return {
            "unit_number": unit.get("unit_number"),
            "expected_marks": unit.get("expected_marks"),
            "study_time_hours": unit.get("study_time_hours", 2),
            "data_confidence": data_confidence,
            "must_study_2mark": two_mark,
            "should_study_2mark": should_study,
            "one_essay_topic": essay_topic,
            "skip_topics": normalized_skip,
            "all_topics": [],
            "message": None,
        }

    tier_1 = []
    tier_2 = []
    tier_3 = []

    for topic in must_study:
        normalized = _normalize_topic(topic)
        consistency = normalized["consistency"]
        if consistency == "LOCKED" or normalized["priority"] == "MUST":
            tier_1.append(normalized)
        elif consistency == "LIKELY":
            tier_2.append(normalized)
        else:
            tier_3.append(normalized)

    return {
        "unit_number": unit.get("unit_number"),
        "expected_marks": unit.get("expected_marks"),
        "study_time_hours": unit.get("study_time_hours", 3),
        "data_confidence": data_confidence,
        "tier_1_must_master": tier_1,
        "tier_2_should_know_well": tier_2,
        "tier_3_good_to_have": tier_3,
        "tier_4_skip_unless_time": normalized_skip,
        "all_topics": [],
        "message": None,
    }


def marks_potential_is(topic: dict, value: str) -> bool:
    return str(topic.get("marks_potential", "")).strip() == value


def _get_syllabus_text(subject_code: str) -> str:
    """Returns the hardcoded R22 syllabus text for a subject (skips Vision phase)."""
    structure = SYLLABUS_STRUCTURE.get(subject_code, {})
    if not structure:
        # Try to find the subject name
        subject = next((s for s in SUBJECTS if s["subject_code"] == subject_code), None)
        name = subject["subject_name"] if subject else subject_code
        return f"JNTUH R22 Syllabus for {name}: Units 1-5 (full syllabus structure not available, use search data)"

    subject = next((s for s in SUBJECTS if s["subject_code"] == subject_code), None)
    name = subject["subject_name"] if subject else subject_code

    lines = [f"JNTUH R22 Syllabus: {name} ({subject_code})", ""]
    for unit_num in sorted(structure.keys()):
        topics = structure[unit_num]
        lines.append(f"UNIT {unit_num}:")
        for t in topics:
            lines.append(f"  - {t}")
        lines.append("")

    return "\n".join(lines)


def _get_subject_name(subject_code: str) -> str:
    subject = next((s for s in SUBJECTS if s["subject_code"] == subject_code), None)
    return subject["subject_name"] if subject else subject_code


def _get_subject_branch(subject_code: str) -> str:
    subject = next((s for s in SUBJECTS if s["subject_code"] == subject_code), None)
    return subject["branch"] if subject else "CSE"


def _cache_key(subject_code: str, goal: str) -> str:
    return f"pipeline:v4:{subject_code}:{goal}"


def _phase_report_entry(phase: int, name: str, status: str, mode: str, message: str) -> dict:
    return {
        "phase": phase,
        "name": name,
        "status": status,
        "mode": mode,
        "message": message,
    }


def _group_previous_questions(subject_code: str) -> tuple[list, dict, int]:
    prev_questions = frequency_index.get_questions_for_subject(subject_code)
    grouped: dict[str, list] = {}
    for question in prev_questions:
        exam_key = f"{question['year']}_{question['exam'].replace('/', '_')}"
        grouped.setdefault(exam_key, []).append(question)

    papers_analyzed = len(set(f"{q['year']}_{q['exam']}" for q in prev_questions))
    return prev_questions, grouped, papers_analyzed


def _seed_syllabus_index(subject_code: str) -> dict:
    structure = SYLLABUS_STRUCTURE.get(subject_code, {})
    seeded_index = {}

    for unit_number, topics in structure.items():
        for topic in topics:
            seeded_index[topic] = {
                "topic": topic,
                "subject_code": subject_code,
                "unit": unit_number,
                "total_appearances": 0,
                "frequency_score": None,
                "avg_marks": None,
                "consistency": "NO_DATA",
                "last_seen_year": None,
                "trend": "NO_DATA",
                "guaranteed_2mark": False,
                "high_value_10mark": False,
                "marks_history": [],
                "units_asked_in": [unit_number],
                "data_confidence": "none",
            }

    return seeded_index


def _compute_index_status(question_count: int) -> str:
    if question_count == 0:
        return "syllabus_only"
    if question_count < 30:
        return "partial_data"
    return "full_5year"


def _build_local_fallback_payload(subject_code: str, subject_name: str, goal: str, warnings: list[str], phase_report: list[dict]) -> tuple[dict, str, list]:
    from pipeline.prep_phase import _manual_format

    index = frequency_index.get_index(subject_code)
    if not index:
        index = _seed_syllabus_index(subject_code)
    data_confidence = frequency_index.get_data_confidence(subject_code)
    question_count = frequency_index.get_question_count(subject_code)

    plan_data = pass_strategy.generate_plan(index) if goal == "pass" else high_marks_strategy.generate_plan(index)
    all_topics = list(index.values())
    prev_questions, pyq_grouped, papers_analyzed = _group_previous_questions(subject_code)

    has_data = plan_data.get("has_data", False)
    if has_data:
        study_topics = [
            topic for topic in all_topics
            if topic.get("consistency") in ("LOCKED", "LIKELY") or (topic.get("frequency_score") or 0) >= 50
        ]
        skip_topics = [topic for topic in all_topics if topic not in study_topics]
        priority_units = sorted(set(
            topic["unit"] for topic in study_topics if (topic.get("frequency_score") or 0) >= 60
        ))[:3]
        locked_topics = [
            topic for topic in all_topics
            if topic.get("consistency") == "LOCKED" and topic.get("guaranteed_2mark")
        ]
        exp_total = plan_data.get("total_expected_marks") or 0
        exp_range = [max(0, int(exp_total - 5)), int(exp_total + 8)]
    else:
        study_topics = all_topics
        skip_topics = []
        priority_units = [1, 2, 3]
        locked_topics = []
        exp_range = [None, None]

    response = {
        "meta": {
            "subject_code": subject_code,
            "subject_name": subject_name,
            "branch": _get_subject_branch(subject_code),
            "regulation": "R22",
            "generated_at": datetime.now().isoformat(),
            "goal": goal,
            "goal_display": plan_data.get("goal_display", goal),
            "model_used": "local_strategy_fallback",
            "cache_hit": False,
            "data_confidence": data_confidence,
            "papers_analyzed": papers_analyzed,
            "index_status": _compute_index_status(question_count),
            "question_count": question_count,
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
        "units": plan_data.get("units", []),
        "exam_strategy": {
            "pass_strategy": {
                "golden_rule": "Answer ALL 2-mark questions first, then attempt the safest long answers.",
                "unit_selection": f"Focus on Units {', '.join(str(unit) for unit in (priority_units or [1, 2, 3]))}",
                "time_management": "2-mark: 3 min | 5-mark: 8 min | 10-mark: 15 min",
                "guaranteed_marks_topics_count": len(locked_topics),
                "guaranteed_marks_total": len(locked_topics) * 2,
            },
            "high_marks_strategy": {
                "golden_rule": "Master the highest-confidence topics first, then expand to supporting topics.",
                "unit_selection": "Cover all 5 units, but finish priority units first.",
                "time_management": "Start with your strongest 10-mark answers before moving to shorter questions.",
                "target_breakdown": {"2_mark": "14/15", "5_mark": "20/25", "10_mark": "30/35"},
            },
        },
        "warnings": warnings,
        "previous_year_questions": pyq_grouped,
        "pipeline_report": phase_report,
    }

    pdf_text = _manual_format(plan_data, subject_name)
    return response, pdf_text, all_topics


async def run_pipeline_stream(subject_code: str, goal: str):
    """
    Generator that yields SSE events for each pipeline phase.
    The frontend reads these via EventSource to update the UI in real-time.
    """
    key = _cache_key(subject_code, goal)
    subject_name = _get_subject_name(subject_code)

    # ── CHECK CACHE FIRST ──
    cached = cache.get(key)
    if cached:
        logger.info(f"CACHE HIT [{key}] — serving instantly")
        yield _sse({"phase": "cache_hit", "status": "complete", "msg": "⚡ Loading cached result..."})
        yield _sse({
            "phase": "done",
            "plan": cached.get("plan", {}),
            "pdf_text": cached.get("pdf_text", ""),
            "virtual_index": cached.get("virtual_index", []),
            "cached": True,
        })
        return

    logger.info(f"CACHE MISS [{key}] — starting 5-phase pipeline for {subject_name}/{goal}")
    warnings: list[str] = []
    phase_report: list[dict] = []

    # ── PHASE 1: VISION (syllabus extraction) ──
    yield _sse({"phase": 1, "status": "processing", "msg": "Loading R22 syllabus structure..."})
    await asyncio.sleep(0.3)  # minimal delay for UI smoothness
    syllabus_text = _get_syllabus_text(subject_code)
    phase_1_msg = f"✅ Syllabus loaded ({subject_name})"
    phase_report.append(_phase_report_entry(1, "Vision", "complete", "local", phase_1_msg))
    yield _sse({"phase": 1, "status": "complete", "msg": phase_1_msg})

    # ── PHASE 2: SEARCH (DuckDuckGo retrieval) ──
    yield _sse({"phase": 2, "status": "processing", "msg": "Searching JNTUH paper banks with free web retrieval..."})
    search_data: dict = {"documents": [], "raw_text": ""}
    try:
        from pipeline.search_phase import run_search_phase

        search_data = await run_search_phase(subject_name, subject_code)
        if search_data.get("error"):
            error_label = str(search_data.get("error", "search_unavailable")).replace("_", " ")
            phase_2_msg = f"⚠️ Live search unavailable: {error_label}"
            warnings.append(f"Phase 2 SEARCH fell back because {error_label}.")
            phase_report.append(_phase_report_entry(2, "Search", "warning", "fallback", phase_2_msg))
            yield _sse({"phase": 2, "status": "warning", "msg": phase_2_msg})
        else:
            doc_count = len(search_data.get("documents", []))
            phase_2_msg = f"✅ Retrieved {doc_count} live exam-resource documents"
            phase_report.append(_phase_report_entry(2, "Search", "complete", "live", phase_2_msg))
            yield _sse({"phase": 2, "status": "complete", "msg": phase_2_msg})
    except Exception as e:
        logger.error(f"Phase 2 failed: {e}")
        search_data = {"documents": [], "raw_text": "", "error": str(e)}
        phase_2_msg = "⚠️ Search failed, switching to syllabus-first fallback"
        warnings.append(f"Phase 2 SEARCH failed and was replaced with syllabus-only fallback: {str(e)[:80]}")
        phase_report.append(_phase_report_entry(2, "Search", "warning", "fallback", phase_2_msg))
        yield _sse({"phase": 2, "status": "warning", "msg": phase_2_msg})

    # ── PHASE 3: ANALYSIS (OpenRouter RAG mapping) ──
    yield _sse({"phase": 3, "status": "processing", "msg": "Mapping retrieved question-bank text back to the syllabus..."})
    virtual_index: list = []
    fusion_mode = "fallback"
    try:
        from pipeline.fusion_phase import run_fusion_phase

        virtual_index, fusion_mode = await run_fusion_phase(syllabus_text, search_data)
        if virtual_index:
            if fusion_mode == "live":
                phase_3_msg = f"✅ {len(virtual_index)} syllabus topics mapped with the analysis model"
                phase_report.append(_phase_report_entry(3, "Analysis", "complete", "live", phase_3_msg))
                yield _sse({"phase": 3, "status": "complete", "msg": phase_3_msg})
            else:
                phase_3_msg = f"⚠️ Using fallback topic mapping for {len(virtual_index)} syllabus topics"
                warnings.append("Phase 3 ANALYSIS used lexical fallback instead of the OpenRouter analysis model.")
                phase_report.append(_phase_report_entry(3, "Analysis", "warning", "fallback", phase_3_msg))
                yield _sse({"phase": 3, "status": "warning", "msg": phase_3_msg})
        else:
            phase_3_msg = "⚠️ Analysis produced no topic index, preparing local fallback plan"
            warnings.append("Phase 3 ANALYSIS produced no usable topic index.")
            phase_report.append(_phase_report_entry(3, "Analysis", "warning", "fallback", phase_3_msg))
            yield _sse({"phase": 3, "status": "warning", "msg": phase_3_msg})
    except Exception as e:
        logger.error(f"Phase 3 failed: {e}")
        phase_3_msg = "⚠️ Analysis failed, preparing local fallback plan"
        warnings.append(f"Phase 3 ANALYSIS failed and switched to the local study-plan engine: {str(e)[:80]}")
        phase_report.append(_phase_report_entry(3, "Analysis", "warning", "fallback", phase_3_msg))
        yield _sse({"phase": 3, "status": "warning", "msg": phase_3_msg})

    should_use_local_fallback = not virtual_index or (fusion_mode == "fallback" and not search_data.get("documents"))
    if should_use_local_fallback:
        phase_4_msg = f"⚠️ Using local {'Pass' if goal == 'pass' else 'High Marks'} strategy fallback"
        phase_report.append(_phase_report_entry(4, "Brain", "warning", "fallback", phase_4_msg))
        warnings.append("Phase 4 BRAIN used the deterministic local strategy engine.")
        yield _sse({"phase": 4, "status": "warning", "msg": phase_4_msg})

        phase_5_msg = "⚠️ Using deterministic PDF formatter"
        phase_report.append(_phase_report_entry(5, "Prep", "warning", "fallback", phase_5_msg))
        warnings.append("Phase 5 PREP used the deterministic local formatter.")
        yield _sse({"phase": 5, "status": "warning", "msg": phase_5_msg})

        fallback_plan, fallback_pdf_text, fallback_index = _build_local_fallback_payload(
            subject_code, subject_name, goal, warnings, phase_report
        )
        cache_payload = {
            "plan": fallback_plan,
            "pdf_text": fallback_pdf_text,
            "virtual_index": fallback_index,
        }
        cache.set(key, cache_payload, ttl_seconds=86400 * 7)
        logger.info(f"✅ Pipeline fallback complete and cached: {key}")
        yield _sse({
            "phase": "done",
            "plan": fallback_plan,
            "pdf_text": fallback_pdf_text,
            "virtual_index": fallback_index,
            "cached": False,
        })
        return

    # ── PHASE 4: BRAIN (strategy application) ──
    yield _sse({"phase": 4, "status": "processing", "msg": f"Applying {'Pass' if goal == 'pass' else 'High Marks'} strategy..."})
    study_plan: dict = {}
    try:
        from pipeline.brain_phase import run_brain_phase

        study_plan = await run_brain_phase(virtual_index, goal, subject_name)
        brain_mode = study_plan.pop("_brain_mode", "live")
        exp = study_plan.get("total_expected_marks", "?")
        if brain_mode == "live":
            phase_4_msg = f"✅ Strategy ready — ~{exp} marks expected"
            phase_report.append(_phase_report_entry(4, "Brain", "complete", "live", phase_4_msg))
            yield _sse({"phase": 4, "status": "complete", "msg": phase_4_msg})
        else:
            phase_4_msg = f"⚠️ Local rule engine built the strategy — ~{exp} marks expected"
            warnings.append("Phase 4 BRAIN used the deterministic rule engine.")
            phase_report.append(_phase_report_entry(4, "Brain", "warning", "fallback", phase_4_msg))
            yield _sse({"phase": 4, "status": "warning", "msg": phase_4_msg})
    except Exception as e:
        logger.error(f"Phase 4 failed: {e}")
        phase_4_msg = "⚠️ Strategy generation failed, switching to local rule engine"
        warnings.append(f"Phase 4 BRAIN failed and was replaced with the local strategy engine: {str(e)[:80]}")
        phase_report.append(_phase_report_entry(4, "Brain", "warning", "fallback", phase_4_msg))
        yield _sse({"phase": 4, "status": "warning", "msg": phase_4_msg})

    if not study_plan:
        phase_5_msg = "⚠️ Using deterministic PDF formatter"
        phase_report.append(_phase_report_entry(5, "Prep", "warning", "fallback", phase_5_msg))
        warnings.append("Phase 5 PREP used the deterministic local formatter.")
        yield _sse({"phase": 5, "status": "warning", "msg": phase_5_msg})

        fallback_plan, fallback_pdf_text, fallback_index = _build_local_fallback_payload(
            subject_code, subject_name, goal, warnings, phase_report
        )
        cache_payload = {
            "plan": fallback_plan,
            "pdf_text": fallback_pdf_text,
            "virtual_index": fallback_index,
        }
        cache.set(key, cache_payload, ttl_seconds=86400 * 7)
        logger.info(f"✅ Pipeline fallback complete and cached: {key}")
        yield _sse({
            "phase": "done",
            "plan": fallback_plan,
            "pdf_text": fallback_pdf_text,
            "virtual_index": fallback_index,
            "cached": False,
        })
        return

    # ── PHASE 5: PREP (text formatting) ──
    yield _sse({"phase": 5, "status": "processing", "msg": "Formatting for PDF download..."})
    try:
        from pipeline.prep_phase import run_prep_phase

        pdf_text, prep_mode = await run_prep_phase(study_plan, subject_name)
        if prep_mode == "live":
            phase_5_msg = "✅ PDF text ready"
            phase_report.append(_phase_report_entry(5, "Prep", "complete", "live", phase_5_msg))
            yield _sse({"phase": 5, "status": "complete", "msg": phase_5_msg})
        else:
            phase_5_msg = "⚠️ PDF text built with deterministic formatter"
            warnings.append("Phase 5 PREP used the deterministic formatter.")
            phase_report.append(_phase_report_entry(5, "Prep", "warning", "fallback", phase_5_msg))
            yield _sse({"phase": 5, "status": "warning", "msg": phase_5_msg})
    except Exception as e:
        logger.error(f"Phase 5 failed: {e}")
        from pipeline.prep_phase import _manual_format

        pdf_text = _manual_format(study_plan, subject_name)
        phase_5_msg = "⚠️ Formatting failed, using deterministic formatter"
        warnings.append(f"Phase 5 PREP failed and used the deterministic formatter: {str(e)[:80]}")
        phase_report.append(_phase_report_entry(5, "Prep", "warning", "fallback", phase_5_msg))
        yield _sse({"phase": 5, "status": "warning", "msg": phase_5_msg})

    # ── ENRICHMENT: Add meta fields ──
    local_question_count = frequency_index.get_question_count(subject_code)
    _, pyq_grouped, local_papers_analyzed = _group_previous_questions(subject_code)
    data_confidence = "full" if len(search_data.get("documents", [])) >= 4 else ("partial" if search_data.get("documents") else frequency_index.get_data_confidence(subject_code))
    papers_analyzed = max(local_papers_analyzed, len(search_data.get("documents", [])))
    adapted_units = [
        _adapt_unit_for_ui(unit, goal, data_confidence)
        for unit in study_plan.get("units", [])
    ]
    topics_to_study = sum(
        len(unit.get("must_study_2mark", []))
        + len(unit.get("should_study_2mark", []))
        + (1 if unit.get("one_essay_topic") else 0)
        + len(unit.get("tier_1_must_master", []))
        + len(unit.get("tier_2_should_know_well", []))
        + len(unit.get("tier_3_good_to_have", []))
        for unit in adapted_units
    )
    topics_to_skip = sum(
        len(unit.get("skip_topics", [])) + len(unit.get("tier_4_skip_unless_time", []))
        for unit in adapted_units
    )

    enriched_plan = {
        "meta": {
            "subject_code": subject_code,
            "subject_name": subject_name,
            "branch": "CSE",
            "regulation": "R22",
            "generated_at": datetime.now().isoformat(),
            "goal": goal,
            "goal_display": study_plan.get("goal_display", goal),
            "model_used": "openrouter_rag_pipeline",
            "cache_hit": False,
            "data_confidence": data_confidence,
            "papers_analyzed": papers_analyzed,
            "index_status": "live_synthesis",
            "question_count": max(len(virtual_index), local_question_count),
        },
        "summary": {
            "total_topics_in_syllabus": len(virtual_index),
            "topics_to_study": topics_to_study,
            "topics_to_skip": topics_to_skip,
            "expected_marks_range": [
                max(0, int(study_plan.get("total_expected_marks", 30) - 5)),
                int(study_plan.get("total_expected_marks", 40) + 8),
            ],
            "study_time_estimate_hours": study_plan.get("total_study_hours", 10),
            "priority_units": [1, 2, 3],
            "confidence_level": study_plan.get("confidence", "medium"),
            "guaranteed_marks_count": study_plan.get("exam_strategy", {}).get("guaranteed_marks", 0),
        },
        "units": adapted_units,
        "exam_strategy": {
            "pass_strategy": study_plan.get("exam_strategy", {}),
            "high_marks_strategy": study_plan.get("exam_strategy", {}),
        },
        "warnings": warnings,
        "previous_year_questions": pyq_grouped,
        "pipeline_report": phase_report,
    }

    # ── CACHE THE RESULT — "Compute Once, Serve Forever" ──
    cache_payload = {
        "plan": enriched_plan,
        "pdf_text": pdf_text,
        "virtual_index": virtual_index,
    }
    cache.set(key, cache_payload, ttl_seconds=86400 * 7)  # 7 days
    logger.info(f"✅ Pipeline complete and cached: {key}")

    yield _sse({
        "phase": "done",
        "plan": enriched_plan,
        "pdf_text": pdf_text,
        "virtual_index": virtual_index,
        "cached": False,
    })


def _sse(data: dict) -> str:
    """Format a dict as an SSE event string."""
    return f"data: {json.dumps(data, default=str)}\n\n"
