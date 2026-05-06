"""
Phase 4: BRAIN — Local Strategy Engine
Uses deterministic local rules on the analyzed topic index.
No extra API keys required.
"""
from core.logger import logger


async def run_brain_phase(virtual_index: list, goal: str, subject_name: str) -> dict:
    plan = _local_brain(virtual_index, goal)
    logger.info(
        f"✅ Phase 4 BRAIN complete: local strategy for {subject_name}, "
        f"{plan.get('total_expected_marks', '?')} expected marks"
    )
    return plan


def _local_brain(virtual_index: list, goal: str) -> dict:
    units: dict[int, list] = {}
    for topic in virtual_index:
        unit_number = int(topic.get("unit", 1) or 1)
        units.setdefault(unit_number, []).append(topic)

    result_units = []
    total_marks = 0
    total_hours = 0

    for unit_num in range(1, 6):
        topics = list(units.get(unit_num, []))
        topics.sort(key=lambda item: item.get("frequency_score", 0), reverse=True)

        if goal == "pass":
            must = [t for t in topics if t.get("consistency") in ("LOCKED", "LIKELY")][:5]
            skip = [t for t in topics if t.get("consistency") in ("POSSIBLE", "DORMANT")][:]
            expected = len(must) * 3
            hours = 2 if must else 1
        else:
            must = [t for t in topics if t.get("consistency") != "DORMANT"][:8]
            skip = [t for t in topics if t.get("consistency") == "DORMANT"]
            expected = len(must) * 4
            hours = 4 if must else 2

        total_marks += expected
        total_hours += hours

        result_units.append({
            "unit_number": unit_num,
            "unit_title": f"Unit {unit_num}",
            "expected_marks": expected if must else None,
            "study_time_hours": hours,
            "must_study": [
                {
                    "name": topic["topic"],
                    "priority": "MUST" if topic.get("consistency") == "LOCKED" else "SHOULD",
                    "frequency_score": topic.get("frequency_score", 0),
                    "consistency": topic.get("consistency", "POSSIBLE"),
                    "marks_potential": topic.get("marks_potential", "5"),
                    "question_type": f"{topic.get('marks_potential', '5')}-mark answer",
                    "what_to_focus_on": topic.get("exam_tip", "Revise the definition, flow, and one example."),
                }
                for topic in must
            ],
            "skip_topics": [
                {
                    "name": topic["topic"],
                    "skip_reason": topic.get("exam_tip", f"Lower retrieval signal ({topic.get('consistency', 'DORMANT')})."),
                }
                for topic in skip
            ],
        })

    return {
        "_brain_mode": "local",
        "goal": goal,
        "goal_display": "Just Pass (28+ marks)" if goal == "pass" else "High Marks (60+ marks)",
        "total_expected_marks": min(total_marks, 75) if total_marks else None,
        "confidence": "medium" if total_marks else "none",
        "total_study_hours": total_hours,
        "units": result_units,
        "exam_strategy": {
            "golden_rule": "Start with the strongest repeated topics before expanding to weak-signal areas.",
            "time_management": "2-mark: 3 min | 5-mark: 8 min | 10-mark: 15 min",
            "guaranteed_marks": 0,
        },
    }
