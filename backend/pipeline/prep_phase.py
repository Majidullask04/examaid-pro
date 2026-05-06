"""
Phase 5: PREP — Deterministic Formatter
Formats the study plan into a stable plain-text guide for the PDF endpoint.
"""
from core.logger import logger


async def run_prep_phase(study_plan: dict, subject_name: str) -> tuple[str, str]:
    text = _manual_format(study_plan, subject_name)
    logger.info(f"✅ Phase 5 PREP complete: {len(text)} chars of deterministic text")
    return text, "local"


def _manual_format(plan: dict, subject_name: str) -> str:
    lines = []
    goal = plan.get("goal_display", plan.get("goal", "Study Plan"))
    lines.append("EXAMHELPER R22 STUDY GUIDE")
    lines.append(f"Subject: {subject_name}")
    lines.append(f"Strategy: {goal}")
    lines.append(f"Expected: {plan.get('total_expected_marks', 'N/A')} marks | Study: {plan.get('total_study_hours', '?')} hours")
    lines.append("")
    lines.append("=" * 50)
    lines.append("")

    for unit in plan.get("units", []):
        unit_num = unit.get("unit_number", "?")
        title = unit.get("unit_title", f"Unit {unit_num}")
        exp = unit.get("expected_marks", "N/A")
        hours = unit.get("study_time_hours", "?")

        lines.append(f"=== UNIT {unit_num}: {title} (Expected: {exp} marks | Study: {hours}h) ===")
        lines.append("")

        if unit.get("message"):
            lines.append(f"NOTE: {unit['message']}")
            lines.append("")

        must = unit.get("must_study", [])
        if must:
            lines.append("MUST STUDY:")
            for topic in must:
                name = topic.get("name", "Unknown")
                marks = topic.get("marks_potential", "?")
                consistency = topic.get("consistency", "")
                tip = topic.get("what_to_focus_on", "")
                question_type = topic.get("question_type", "")
                lines.append(f"+ {name} [{marks}-mark {question_type}] [{consistency}]")
                if tip:
                    lines.append(f"  -> {tip}")
            lines.append("")

        all_topics = unit.get("all_topics", [])
        if all_topics:
            lines.append("STUDY ALL TOPICS:")
            for topic in all_topics:
                name = topic.get("name", "Unknown")
                question_type = topic.get("question_type", "unknown")
                tip = topic.get("what_to_focus_on", "Study this topic thoroughly.")
                lines.append(f"+ {name} [{question_type}]")
                lines.append(f"  -> {tip}")
            lines.append("")

        skip = unit.get("skip_topics", [])
        if skip:
            lines.append("SKIP:")
            for topic in skip:
                name = topic.get("name", "Unknown")
                reason = topic.get("skip_reason", "Low priority")
                lines.append(f"x {name}: {reason}")
            lines.append("")

        lines.append("---")
        lines.append("")

    strategy = plan.get("exam_strategy", {})
    if strategy:
        lines.append("EXAM DAY STRATEGY:")
        if strategy.get("golden_rule"):
            lines.append(f"  {strategy['golden_rule']}")
        if strategy.get("time_management"):
            lines.append(f"  Time: {strategy['time_management']}")
        if strategy.get("guaranteed_marks"):
            lines.append(f"  Guaranteed marks: {strategy['guaranteed_marks']}")
        lines.append("")

    lines.append(f"TOTAL: Expected {plan.get('total_expected_marks', 'N/A')} marks | Study: {plan.get('total_study_hours', '?')} hours")
    return "\n".join(lines)
