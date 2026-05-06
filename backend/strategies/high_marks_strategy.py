"""
HighMarksStrategy — Target: 60+/75.
INCLUDES NO_DATA fallback when no question data exists.
"""


class HighMarksStrategy:

    def generate_plan(self, frequency_index: dict, total_units: int = 5) -> dict:
        has_data = any(
            t.get("frequency_score") is not None and t.get("data_confidence") != "none"
            for t in frequency_index.values()
        )

        units_data = {}
        for u in range(1, total_units + 1):
            units_data[u] = [
                t for t in frequency_index.values()
                if u in (t.get("units_asked_in") or [t.get("unit", u)])
            ]

        plan_units = []

        for unit_num in range(1, total_units + 1):
            topics = units_data.get(unit_num, [])

            if not has_data:
                plan_units.append({
                    "unit_number": unit_num,
                    "data_confidence": "none",
                    "all_topics": [self._format_topic_no_data(t) for t in topics],
                    "tier_1_must_master": [],
                    "tier_2_should_know_well": [],
                    "tier_3_good_to_have": [],
                    "tier_4_skip_unless_time": [],
                    "study_order": [t["topic"] for t in topics],
                    "time_allocation_percent": {},
                    "message": "Master all topics — no previous paper data to prioritize",
                    "expected_marks": None,
                    "study_time_hours": max(3, len(topics) * 0.5),
                })
                continue

            scored = [(t, self._composite_score(t)) for t in topics]
            scored.sort(key=lambda x: x[1], reverse=True)

            tier1 = [t for t, s in scored if s >= 80]
            tier2 = [t for t, s in scored if 50 <= s < 80]
            tier3 = [t for t, s in scored if 25 <= s < 50]
            tier4 = [t for t, s in scored if s < 25]

            expected = (
                len(tier1) * 8.0 * 0.85 + len(tier2) * 5.0 * 0.70
                + len(tier3) * 2.0 * 0.50
            )

            plan_units.append({
                "unit_number": unit_num,
                "data_confidence": topics[0].get("data_confidence", "partial") if topics else "none",
                "tier_1_must_master": [self._format_topic(t) for t in tier1],
                "tier_2_should_know_well": [self._format_topic(t) for t in tier2],
                "tier_3_good_to_have": [self._format_topic(t) for t in tier3],
                "tier_4_skip_unless_time": [self._format_topic(t) for t in tier4],
                "study_order": [t["topic"] for t, _ in scored if _ >= 25],
                "time_allocation_percent": self._calc_time_alloc(scored),
                "all_topics": [],
                "message": None,
                "expected_marks": round(min(expected, 15), 1),
                "study_time_hours": max(2, round(
                    len(tier1) * 0.8 + len(tier2) * 0.5 + len(tier3) * 0.2, 1
                )),
            })

        total_expected = sum(u["expected_marks"] or 0 for u in plan_units)
        return {
            "goal": "high_marks",
            "goal_display": "High Marks (60+ marks)",
            "has_data": has_data,
            "total_expected_marks": round(total_expected, 1) if has_data else None,
            "confidence": ("high" if total_expected >= 55 else "medium") if has_data else "none",
            "total_study_hours": sum(u["study_time_hours"] for u in plan_units),
            "units": plan_units,
        }

    def _composite_score(self, t: dict) -> float:
        freq = t.get("frequency_score")
        if freq is None:
            return 0.0
        consistency_map = {"LOCKED": 100, "LIKELY": 60, "POSSIBLE": 20, "DORMANT": 0, "NO_DATA": 0}
        trend_map = {"RISING": 20, "STABLE": 10, "DECLINING": 0, "INSUFFICIENT_DATA": 5, "NO_DATA": 0}
        return (
            freq * 0.4
            + consistency_map.get(t.get("consistency", "NO_DATA"), 0) * 0.3
            + ((t.get("avg_marks") or 0) * 5) * 0.2
            + trend_map.get(t.get("trend", "NO_DATA"), 0) * 0.1
        )

    def _calc_time_alloc(self, scored: list) -> dict:
        eligible = [(t, s) for t, s in scored if s >= 25]
        total_marks = sum(t.get("avg_marks") or 0 for t, _ in eligible) or 1
        return {
            t["topic"]: round(((t.get("avg_marks") or 0) / total_marks) * 100, 1)
            for t, _ in eligible
        }

    def _format_topic(self, t: dict) -> dict:
        history = t.get("marks_history", [])
        appeared_count = len(set(f"{h['year']}_{h['exam']}" for h in history))
        return {
            "name": t["topic"],
            "priority": "MUST" if t.get("consistency") in ("LOCKED", "LIKELY") else "OPTIONAL",
            "frequency_score": t.get("frequency_score"),
            "consistency": t.get("consistency", "NO_DATA"),
            "trend": t.get("trend", "NO_DATA"),
            "marks_history": history[-5:],
            "appeared_in": f"{appeared_count}/5 exams",
            "guaranteed": t.get("guaranteed_2mark", False),
            "high_value": t.get("high_value_10mark", False),
            "question_type": self._infer_type(t),
            "what_to_focus_on": self._mastery_tip(t),
            "data_confidence": t.get("data_confidence", "none"),
        }

    def _format_topic_no_data(self, t: dict) -> dict:
        return {
            "name": t["topic"],
            "priority": "NO_DATA",
            "frequency_score": None,
            "consistency": "NO_DATA",
            "trend": "NO_DATA",
            "marks_history": [],
            "appeared_in": "no data",
            "guaranteed": False,
            "high_value": False,
            "question_type": "unknown",
            "what_to_focus_on": "No previous paper data — study this topic thoroughly as precaution",
            "data_confidence": "none",
        }

    def _infer_type(self, t: dict) -> str:
        avg = t.get("avg_marks")
        if avg is None:
            return "unknown"
        if avg <= 2:
            return "2-mark short answer"
        if avg >= 8:
            return "10-mark essay"
        return "5-mark explain"

    def _mastery_tip(self, t: dict) -> str:
        if t.get("consistency") == "LOCKED" and t.get("high_value_10mark"):
            return "ABSOLUTE MUST — appears every exam as high-mark question."
        if t.get("trend") == "RISING":
            return "RISING TREND — prepare for 10-mark depth."
        if t.get("guaranteed_2mark"):
            return "Easy 2 marks — definition + example."
        return f"Study at {t.get('avg_marks', '?')}-mark depth. {t.get('total_appearances', 0)} appearances."
