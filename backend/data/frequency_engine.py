"""
TopicFrequencyIndex — Builds frequency scores from REAL question data only.
Handles NO_DATA state gracefully when no questions exist.
"""
from collections import defaultdict
from sqlalchemy.exc import OperationalError

from core.logger import logger
from data.models import SessionLocal, Question, TopicIndexEntry, Subject, init_db


class TopicFrequencyIndex:
    EXAM_WINDOW = 5

    def _prepare_schema(self):
        init_db()

    def build_index(self, subject_code: str) -> dict:
        """
        Build frequency index from real question data.
        If no questions exist, index entries stay at NO_DATA.
        """
        self._prepare_schema()
        db = SessionLocal()
        try:
            questions = db.query(Question).filter_by(subject_code=subject_code).all()

            # Get all existing syllabus topics (seeded from syllabus structure)
            existing_topics = db.query(TopicIndexEntry).filter_by(subject_code=subject_code).all()
            index = {}

            if not questions:
                # NO question data — return existing topics with NO_DATA confidence
                for entry in existing_topics:
                    index[entry.topic] = self._to_dict(entry)
                return index

            # We have real question data — compute real scores
            topic_appearances: dict[str, list] = defaultdict(list)
            for q in questions:
                for topic in q.extracted_topics:
                    topic_appearances[topic].append({
                        "year": q.year,
                        "exam": q.exam,
                        "marks": q.marks,
                        "unit": q.unit,
                        "difficulty": q.difficulty or "medium",
                    })

            # Determine data confidence based on # of unique exams in data
            all_exams = set(f"{q.year}_{q.exam}" for q in questions)
            if len(all_exams) >= 5:
                data_confidence = "full"
            elif len(all_exams) >= 2:
                data_confidence = "partial"
            else:
                data_confidence = "partial"

            # Update existing topics with computed data
            for entry in existing_topics:
                appearances = topic_appearances.get(entry.topic, [])
                if appearances:
                    freq = self._calc_frequency(appearances)
                    cons = self._calc_consistency(appearances)
                    trend = self._calc_trend(appearances)
                    g2m = self._is_guaranteed_2mark(appearances)
                    hv10 = self._is_high_value_10mark(appearances)
                    history = [
                        {"year": a["year"], "exam": a["exam"], "marks": a["marks"]}
                        for a in sorted(appearances, key=lambda x: (x["year"], x["exam"]))
                    ]

                    entry.total_appearances = len(appearances)
                    entry.frequency_score = freq
                    entry.avg_marks = self._avg_marks(appearances)
                    entry.consistency = cons
                    entry.last_seen_year = self._last_seen(appearances)
                    entry.trend = trend
                    entry.guaranteed_2mark = g2m
                    entry.high_value_10mark = hv10
                    entry.marks_history = history
                    entry.units_asked_in = list(set(a["unit"] for a in appearances))
                    entry.data_confidence = data_confidence
                else:
                    # Topic is in syllabus but never appeared in papers we have
                    entry.frequency_score = 0.0
                    entry.consistency = "DORMANT"
                    entry.trend = "NO_DATA"
                    entry.data_confidence = data_confidence  # we have data, this topic just didn't appear

                index[entry.topic] = self._to_dict(entry)

            # Handle topics found in papers but NOT in seeded syllabus
            for topic, appearances in topic_appearances.items():
                if topic not in index:
                    unit = appearances[0]["unit"]
                    new_entry = TopicIndexEntry(
                        subject_code=subject_code,
                        topic=topic,
                        unit=unit,
                        total_appearances=len(appearances),
                        frequency_score=self._calc_frequency(appearances),
                        avg_marks=self._avg_marks(appearances),
                        consistency=self._calc_consistency(appearances),
                        last_seen_year=self._last_seen(appearances),
                        trend=self._calc_trend(appearances),
                        guaranteed_2mark=self._is_guaranteed_2mark(appearances),
                        high_value_10mark=self._is_high_value_10mark(appearances),
                        marks_history=[
                            {"year": a["year"], "exam": a["exam"], "marks": a["marks"]}
                            for a in sorted(appearances, key=lambda x: (x["year"], x["exam"]))
                        ],
                        units_asked_in=list(set(a["unit"] for a in appearances)),
                        data_confidence=data_confidence,
                    )
                    db.add(new_entry)
                    index[topic] = self._to_dict(new_entry)

            db.commit()
            return index
        except OperationalError as exc:
            logger.warning(f"Frequency index build skipped because SQLite schema is not ready: {exc}")
            return {}
        finally:
            db.close()

    def get_index(self, subject_code: str) -> dict:
        """Retrieve pre-computed index from SQLite."""
        self._prepare_schema()
        db = SessionLocal()
        try:
            entries = db.query(TopicIndexEntry).filter_by(subject_code=subject_code).all()
            if not entries:
                return {}
            return {e.topic: self._to_dict(e) for e in entries}
        except OperationalError as exc:
            logger.warning(f"Topic index table unavailable, returning empty index: {exc}")
            return {}
        finally:
            db.close()

    def get_data_confidence(self, subject_code: str) -> str:
        """Returns the overall data confidence for a subject."""
        self._prepare_schema()
        db = SessionLocal()
        try:
            entries = db.query(TopicIndexEntry).filter_by(subject_code=subject_code).all()
            if not entries:
                return "none"
            confidences = [e.data_confidence or "none" for e in entries]
            if "full" in confidences:
                return "full"
            if "partial" in confidences:
                return "partial"
            return "none"
        except OperationalError as exc:
            logger.warning(f"Could not read topic index confidence, defaulting to none: {exc}")
            return "none"
        finally:
            db.close()

    def get_questions_for_subject(self, subject_code: str) -> list:
        """Returns all real question objects for the previous-questions tab."""
        self._prepare_schema()
        db = SessionLocal()
        try:
            questions = db.query(Question).filter_by(subject_code=subject_code).all()
            return [
                {
                    "question_id": q.question_id,
                    "unit": q.unit,
                    "year": q.year,
                    "exam": q.exam,
                    "marks": q.marks,
                    "question": q.question_text,
                    "topics_tagged": q.extracted_topics,
                }
                for q in sorted(questions, key=lambda x: (x.year, x.exam), reverse=True)
            ]
        except OperationalError as exc:
            logger.warning(f"Could not read previous questions, returning empty list: {exc}")
            return []
        finally:
            db.close()

    def get_question_count(self, subject_code: str) -> int:
        self._prepare_schema()
        db = SessionLocal()
        try:
            return db.query(Question).filter_by(subject_code=subject_code).count()
        except OperationalError as exc:
            logger.warning(f"Could not count subject questions, defaulting to 0: {exc}")
            return 0
        finally:
            db.close()

    def _to_dict(self, entry: TopicIndexEntry) -> dict:
        return {
            "topic": entry.topic,
            "subject_code": entry.subject_code,
            "unit": entry.unit,
            "total_appearances": entry.total_appearances or 0,
            "frequency_score": entry.frequency_score,  # None if NO_DATA
            "avg_marks": entry.avg_marks,               # None if NO_DATA
            "consistency": entry.consistency or "NO_DATA",
            "last_seen_year": entry.last_seen_year,
            "trend": entry.trend or "NO_DATA",
            "guaranteed_2mark": entry.guaranteed_2mark or False,
            "high_value_10mark": entry.high_value_10mark or False,
            "marks_history": entry.marks_history or [],
            "units_asked_in": entry.units_asked_in or [entry.unit],
            "data_confidence": entry.data_confidence or "none",
        }

    # ─── Core Calculation Methods ────────────────────────────────────────────

    def _unique_exams(self, appearances: list) -> int:
        return len(set(f"{a['year']}_{a['exam']}" for a in appearances))

    def _calc_frequency(self, appearances: list) -> float:
        unique = self._unique_exams(appearances)
        mapping = {5: 100, 4: 80, 3: 60, 2: 35, 1: 15}
        return float(mapping.get(unique, 5))

    def _avg_marks(self, appearances: list) -> float:
        if not appearances:
            return 0.0
        return round(sum(a["marks"] for a in appearances) / len(appearances), 1)

    def _calc_consistency(self, appearances: list) -> str:
        unique = self._unique_exams(appearances)
        if unique >= 3:
            return "LOCKED"
        if unique == 2:
            return "LIKELY"
        if unique == 1:
            return "POSSIBLE"
        return "DORMANT"

    def _last_seen(self, appearances: list) -> int:
        if not appearances:
            return 0
        return max(a["year"] for a in appearances)

    def _calc_trend(self, appearances: list) -> str:
        if len(appearances) < 2:
            return "INSUFFICIENT_DATA"
        sorted_a = sorted(appearances, key=lambda x: (x["year"], x["exam"]))
        recent = sorted_a[-2:]
        older = sorted_a[:2]
        recent_marks = sum(a["marks"] for a in recent)
        older_marks = sum(a["marks"] for a in older)
        if older_marks == 0:
            return "INSUFFICIENT_DATA"
        if recent_marks > older_marks * 1.5:
            return "RISING"
        if recent_marks < older_marks * 0.5:
            return "DECLINING"
        return "STABLE"

    def _is_guaranteed_2mark(self, appearances: list) -> bool:
        two_mark = [a for a in appearances if a["marks"] == 2]
        return self._unique_exams(two_mark) >= 4

    def _is_high_value_10mark(self, appearances: list) -> bool:
        ten_mark = [a for a in appearances if a["marks"] >= 10]
        return len(ten_mark) >= 2


# Singleton
frequency_index = TopicFrequencyIndex()
