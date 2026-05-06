"""
PassOnlyStrategy — Target: 28 marks (safe buffer: 36).
INCLUDES NO_DATA fallback when no question data exists.
"""


class PassOnlyStrategy:
    PASS_TARGET = 28
    SAFE_BUFFER = 36

    def generate_plan(self, frequency_index: dict, total_units: int = 5) -> dict:
        # Check if ANY topic has real frequency data
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
        total_expected = 0.0

        for unit_num in range(1, total_units + 1):
            topics = units_data.get(unit_num, [])

            if not has_data:
                # ── NO_DATA FALLBACK: list all topics, no priority division ──
                plan_units.append({
                    "unit_number": unit_num,
                    "data_confidence": "none",
                    "all_topics": [self._format_topic_no_data(t) for t in topics],
                    "must_study_2mark": [],
                    "should_study_2mark": [],
                    "one_essay_topic": None,
                    "skip_topics": [],
                    "message": "Study all topics — no previous paper data available yet",
                    "expected_marks": None,
                    "study_time_hours": max(2, len(topics) * 0.3),
                })
                continue

            # ── HAS DATA: real priority logic ──
            must_2m = [
                t for t in topics
                if t.get("consistency") == "LOCKED" and t.get("guaranteed_2mark")
            ]
            likely_2m = sorted(
                [t for t in topics if t.get("consistency") == "LIKELY" and (t.get("avg_marks") or 5) <= 5],
                key=lambda t: t.get("frequency_score") or 0, reverse=True
            )[:3]
            ten_mark_candidates = [t for t in topics if t.get("high_value_10mark")]
            best_10m = max(
                ten_mark_candidates,
                key=lambda t: (t.get("frequency_score") or 0, t.get("consistency") == "LOCKED"),
                default=None
            ) if ten_mark_candidates else None
            skip_topics = [
                t for t in topics
                if t not in must_2m and t not in likely_2m and t != best_10m
                and t.get("consistency") in ("POSSIBLE", "DORMANT", "NO_DATA")
                and (t.get("frequency_score") or 0) < 35
            ]

            expected = (
                len(must_2m) * 2.0 + len(likely_2m) * 1.5
                + (10 * 0.6 if best_10m else 0)
            )
            total_expected += expected

            plan_units.append({
                "unit_number": unit_num,
                "data_confidence": topics[0].get("data_confidence", "partial") if topics else "none",
                "must_study_2mark": [self._format_topic(t) for t in must_2m],
                "should_study_2mark": [self._format_topic(t) for t in likely_2m],
                "one_essay_topic": self._format_topic(best_10m) if best_10m else None,
                "skip_topics": [self._format_topic(t) for t in skip_topics],
                "all_topics": [],
                "message": None,
                "expected_marks": round(expected, 1),
                "study_time_hours": max(1, round(
                    len(must_2m) * 0.3 + len(likely_2m) * 0.4 + (2 if best_10m else 0), 1
                )),
            })

        return {
            "goal": "pass",
            "goal_display": "Just Pass (28+ marks)",
            "has_data": has_data,
            "total_expected_marks": round(total_expected, 1) if has_data else None,
            "confidence": ("high" if total_expected >= self.SAFE_BUFFER else "medium") if has_data else "none",
            "total_study_hours": sum(u["study_time_hours"] for u in plan_units),
            "units": plan_units,
        }

    def _format_topic(self, t: dict) -> dict:
        if not t:
            return {}
        history = t.get("marks_history", [])
        appeared_count = len(set(f"{h['year']}_{h['exam']}" for h in history))
        return {
            "name": t["topic"],
            "priority": "MUST" if t.get("consistency") == "LOCKED" else "SHOULD",
            "frequency_score": t.get("frequency_score"),
            "consistency": t.get("consistency", "NO_DATA"),
            "trend": t.get("trend", "NO_DATA"),
            "marks_history": history[-5:],
            "appeared_in": f"{appeared_count}/5 exams",
            "guaranteed": t.get("guaranteed_2mark", False),
            "high_value": t.get("high_value_10mark", False),
            "question_type": self._infer_type(t),
            "what_to_focus_on": self._get_focus_tip(t),
            "data_confidence": t.get("data_confidence", "none"),
        }

    def _format_topic_no_data(self, t: dict) -> dict:
        """Format a topic when NO question data exists."""
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
            "what_to_focus_on": "No previous paper data — include in study plan as precaution",
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

    def _get_focus_tip(self, t: dict) -> str:
        if t.get("guaranteed_2mark"):
            return f"Free {round(t.get('avg_marks', 2))} marks. Basic definition + 1 example."
        if t.get("high_value_10mark"):
            return f"Master this — appeared {t.get('total_appearances', 0)}x as high-mark question."
        if t.get("trend") == "RISING":
            return "Trending UP — likely higher marks this time."
        return f"Appeared {t.get('total_appearances', 0)} time(s). Know the basics."
