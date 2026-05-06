"""
Full output schemas aligned to the blueprint's exact JSON structure.
One schema. Three consumers: API response, frontend renderer, PDF generator.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class InputType:
    text = "text"
    image = "image"


class GenerateRequest(BaseModel):
    input_type: str = "text"
    content: str


# ─── Topic-level schema ───────────────────────────────────────────────────────
class MarkHistoryEntry(BaseModel):
    year: int
    exam: str
    marks: int


class TopicDetail(BaseModel):
    name: str
    priority: str                          # MUST / SHOULD / OPTIONAL / SKIP
    frequency_score: float
    consistency: str                       # LOCKED / LIKELY / POSSIBLE / DORMANT
    trend: str                             # RISING / STABLE / DECLINING
    marks_history: List[MarkHistoryEntry] = []
    appeared_in: str = ""                  # "4/5 exams"
    guaranteed: bool = False
    high_value: bool = False
    question_type: str = ""
    what_to_focus_on: str = ""
    skip_reason: Optional[str] = None
    sample_question: Optional[str] = None


# ─── Unit-level schema ────────────────────────────────────────────────────────
class UnitPlanPass(BaseModel):
    unit_number: int
    must_study_2mark: List[TopicDetail] = []
    should_study_2mark: List[TopicDetail] = []
    one_essay_topic: Optional[TopicDetail] = None
    skip_topics: List[TopicDetail] = []
    expected_marks: float
    study_time_hours: float


class UnitPlanHighMarks(BaseModel):
    unit_number: int
    tier_1_must_master: List[TopicDetail] = []
    tier_2_should_know_well: List[TopicDetail] = []
    tier_3_good_to_have: List[TopicDetail] = []
    tier_4_skip_unless_time: List[TopicDetail] = []
    study_order: List[str] = []
    time_allocation_percent: Dict[str, float] = {}
    expected_marks: float
    study_time_hours: float


# ─── Top-level response schema ────────────────────────────────────────────────
class StudyPlanMeta(BaseModel):
    subject_code: str
    subject_name: str
    branch: str
    regulation: str = "R22"
    generated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    goal: str
    goal_display: str
    model_used: str = "pre-computed"
    cache_hit: bool = False
    data_confidence: str = "high"
    papers_analyzed: int = 10


class StudyPlanSummary(BaseModel):
    total_topics_in_syllabus: int
    topics_to_study: int
    topics_to_skip: int
    expected_marks_range: List[int]
    study_time_estimate_hours: float
    priority_units: List[int]
    confidence_level: str


class ExamStrategyPass(BaseModel):
    golden_rule: str = "Answer ALL 2-mark questions + 2 out of 5 ten-mark questions = 30+ marks"
    unit_selection: str = "Attempt Units 1, 2, 3 fully. Skip Unit 5 if short on time."
    time_management: str = "2-mark: 3 min each | 5-mark: 8 min each | 10-mark: 15 min each"
    guaranteed_marks_topics_count: int = 0
    guaranteed_marks_total: int = 0


class ExamStrategyHighMarks(BaseModel):
    golden_rule: str = "Master all LOCKED topics first, then LIKELY, then RISING"
    unit_selection: str = "All 5 units. Units 2 and 3 carry highest weightage."
    time_management: str = "Start with 10-mark questions you're most confident about."
    target_breakdown: Dict[str, str] = {"2_mark": "14/15", "5_mark": "20/25", "10_mark": "30/35"}


class StudyPlanResponse(BaseModel):
    meta: StudyPlanMeta
    summary: StudyPlanSummary
    units: List[Any]                       # UnitPlanPass or UnitPlanHighMarks
    exam_strategy: Dict[str, Any]
    warnings: List[str] = []
    previous_year_questions: Dict[str, List[Any]] = {}


# ─── Legacy schema (for OCR/explain endpoints) ────────────────────────────────
class FormattedAnswer(BaseModel):
    introduction: Optional[str] = None
    body: Optional[str] = None
    diagram: Optional[str] = None
    conclusion: Optional[str] = None


class AnalysisOutput(BaseModel):
    topic: str = ""
    type: str = "general"
    keywords: List[str] = []


class PreviousQuestion(BaseModel):
    question_id: str
    unit: int
    year: int
    exam: str
    marks: int
    question: str
    topics_tagged: List[str]
