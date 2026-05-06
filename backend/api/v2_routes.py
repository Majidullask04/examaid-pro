"""
ExamAid Pro 2.0 - Enhanced API Routes
V2 API with prediction engine, student tracking, and analytics
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional
import os

from services.prediction_engine import prediction_engine, PredictionResult
from services.openrouter_client import call_text_model
from core.logger import logger

router = APIRouter(prefix="/api/v2")
ENABLE_FUTURE_MODULES = os.getenv("ENABLE_FUTURE_MODULES", "false").lower() == "true"


def _require_future_modules_enabled():
    if not ENABLE_FUTURE_MODULES:
        raise HTTPException(
            status_code=404,
            detail="Future module disabled for MVP. Focus is subjects, predictions, answers, and saved notes.",
        )


# ═══════════════════════════════════════════════════════════════════════════════
#  REQUEST/RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class PredictionResponse(BaseModel):
    id: str
    question_text: str
    probability_score: float
    confidence_level: str
    prediction_reason: str
    marks: int
    times_appeared: int
    last_appeared_year: Optional[int]
    appearance_frequency: float
    topics: List[str]
    key_points: List[str]
    common_mistakes: List[str]
    ai_explanation: Optional[str] = None


class StudyPlanRequest(BaseModel):
    subject_code: str
    student_id: Optional[str] = None
    days_remaining: int = 30
    daily_hours: int = 3
    goal: str = "high_marks"  # pass, high_marks, top_rank
    weak_topics: Optional[List[str]] = []


class StudyPlanResponse(BaseModel):
    plan_id: str
    total_days: int
    daily_hours: int
    total_questions: int
    high_priority_questions: int
    phases: List[dict]
    estimated_coverage_percentage: float


class StudentProgressRequest(BaseModel):
    student_id: str
    subject_code: str


class StudentProgressResponse(BaseModel):
    student_id: str
    subject_code: str
    total_study_hours: float
    questions_practiced: int
    accuracy_rate: float
    topic_mastery: List[dict]
    weak_areas: List[str]
    recommended_focus: List[str]


class MockExamRequest(BaseModel):
    subject_code: str
    question_count: int = 10
    marks_distribution: dict = {"2_mark": 5, "5_mark": 3, "10_mark": 2}
    difficulty_level: str = "mixed"  # easy, medium, hard, mixed


class MockExamResponse(BaseModel):
    exam_id: str
    subject_code: str
    questions: List[dict]
    total_marks: int
    estimated_time_minutes: int
    coverage_analysis: dict


class FeedbackRequest(BaseModel):
    prediction_id: str
    student_id: str
    appeared_in_exam: bool
    accuracy_rating: int  # 1-5
    usefulness_rating: int  # 1-5
    feedback_text: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
#  SUBJECT & PREDICTION ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/subjects")
async def list_subjects(
    branch: Optional[str] = None,
    year: Optional[int] = None,
    search: Optional[str] = None
):
    """
    List all subjects with optional filtering
    """
    # This would query from Supabase
    # For now, return from seed data
    from data.seed_data import SUBJECTS
    
    subjects = SUBJECTS
    
    if branch:
        subjects = [s for s in subjects if s['branch'] == branch]
    if year:
        # Filter by year based on subject code pattern
        subjects = [s for s in subjects if f"R22{branch or 'CS'}{year}0" in s['subject_code']]
    if search:
        subjects = [s for s in subjects if search.lower() in s['subject_name'].lower()]
    
    return {
        "subjects": subjects,
        "total": len(subjects),
        "filters_applied": {
            "branch": branch,
            "year": year,
            "search": search
        }
    }


@router.get("/subjects/{subject_code}/predictions")
async def get_question_predictions(
    subject_code: str,
    confidence: Optional[str] = None,
    marks: Optional[int] = None,
    limit: int = Query(default=20, le=50),
    include_ai_explanation: bool = False
):
    """
    Get AI-predicted questions for a subject
    """
    try:
        # Get previous papers data (would come from DB in production)
        # For now, simulate with realistic data
        previous_papers = _get_mock_previous_papers(subject_code)
        
        # Generate predictions
        predictions = prediction_engine.predict_questions_for_subject(
            subject_code=subject_code,
            previous_papers=previous_papers,
            syllabus_topics=[]
        )
        
        # Filter predictions
        filtered = prediction_engine.get_top_predictions(
            predictions,
            confidence_filter=confidence,
            marks_filter=marks,
            limit=limit
        )
        
        # Add AI explanations if requested
        if include_ai_explanation:
            filtered = await _add_ai_explanations(filtered, subject_code)
        
        return {
            "subject_code": subject_code,
            "total_predictions": len(filtered),
            "predictions": [
                {
                    "id": f"pred_{i}",
                    "question_text": p.question_text,
                    "probability_score": p.probability_score,
                    "confidence_level": p.confidence_level,
                    "prediction_reason": p.prediction_reason,
                    "marks": p.marks,
                    "times_appeared": p.times_appeared,
                    "last_appeared_year": p.last_appeared_year,
                    "appearance_frequency": p.appearance_frequency,
                    "topics": p.topics,
                    "key_points": p.key_points,
                    "common_mistakes": p.common_mistakes,
                    "ai_explanation": getattr(p, 'ai_explanation', None)
                }
                for i, p in enumerate(filtered)
            ],
            "summary": {
                "high_confidence": len([p for p in filtered if p.confidence_level == 'high']),
                "medium_confidence": len([p for p in filtered if p.confidence_level == 'medium']),
                "low_confidence": len([p for p in filtered if p.confidence_level == 'low']),
                "avg_probability": sum(p.probability_score for p in filtered) / len(filtered) if filtered else 0
            }
        }
    
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate predictions: {str(e)}")


@router.post("/subjects/{subject_code}/study-plan")
async def generate_study_plan(
    subject_code: str,
    request: StudyPlanRequest
):
    """
    Generate a personalized study plan based on predictions and student profile
    """
    try:
        # Get predictions
        previous_papers = _get_mock_previous_papers(subject_code)
        predictions = prediction_engine.predict_questions_for_subject(
            subject_code=subject_code,
            previous_papers=previous_papers,
            syllabus_topics=[]
        )
        
        # Generate study plan
        plan = prediction_engine.generate_smart_study_plan(
            predictions=predictions,
            days_remaining=request.days_remaining,
            daily_hours=request.daily_hours
        )
        
        # Calculate coverage
        high_conf_count = len([p for p in predictions if p.confidence_level == 'high'])
        total_questions = len(predictions)
        coverage = (high_conf_count / max(total_questions, 1)) * 100
        
        return {
            "plan_id": f"plan_{subject_code}_{request.student_id or 'guest'}",
            "total_days": plan['total_days'],
            "daily_hours": plan['daily_hours'],
            "total_questions": plan['total_questions'],
            "high_priority_questions": plan['high_priority_questions'],
            "phases": plan['phases'],
            "estimated_coverage_percentage": round(coverage, 2)
        }
    
    except Exception as e:
        logger.error(f"Study plan error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate study plan: {str(e)}")


# ═══════════════════════════════════════════════════════════════════════════════
#  STUDENT PROGRESS & ANALYTICS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/student/{student_id}/progress/{subject_code}")
async def get_student_progress(
    student_id: str,
    subject_code: str
):
    """
    Get student progress for a specific subject
    """
    _require_future_modules_enabled()
    # This would query from Supabase in production
    # Return mock data for demonstration
    
    return {
        "student_id": student_id,
        "subject_code": subject_code,
        "total_study_hours": 12.5,
        "questions_practiced": 45,
        "accuracy_rate": 72.5,
        "topic_mastery": [
            {"topic": "Arrays", "mastery": 85, "questions_attempted": 15},
            {"topic": "Linked Lists", "mastery": 65, "questions_attempted": 10},
            {"topic": "Trees", "mastery": 45, "questions_attempted": 8},
            {"topic": "Graphs", "mastery": 30, "questions_attempted": 5}
        ],
        "weak_areas": ["Graphs", "Trees", "AVL Rotations"],
        "recommended_focus": [
            "Focus on Graph algorithms - appeared 4 times in last 5 years",
            "Practice Tree traversals - 10-mark question likely",
            "Review AVL rotations - commonly asked in exams"
        ]
    }


@router.post("/student/{student_id}/study-session")
async def log_study_session(
    student_id: str,
    session_data: dict
):
    """
    Log a study session for progress tracking
    """
    _require_future_modules_enabled()
    # Would insert into study_sessions table
    return {
        "session_id": f"session_{student_id}_{datetime.now().timestamp()}",
        "status": "logged",
        "message": "Study session recorded successfully"
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  MOCK EXAM & PRACTICE
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/mock-exam/generate")
async def generate_mock_exam(request: MockExamRequest):
    """
    Generate a mock exam based on predictions
    """
    _require_future_modules_enabled()
    try:
        # Get predictions
        previous_papers = _get_mock_previous_papers(request.subject_code)
        predictions = prediction_engine.predict_questions_for_subject(
            subject_code=request.subject_code,
            previous_papers=previous_papers,
            syllabus_topics=[]
        )
        
        # Select questions based on distribution
        exam_questions = []
        
        # 2-mark questions
        two_mark = [p for p in predictions if p.marks == 2][:request.marks_distribution.get('2_mark', 5)]
        exam_questions.extend(two_mark)
        
        # 5-mark questions
        five_mark = [p for p in predictions if p.marks == 5][:request.marks_distribution.get('5_mark', 3)]
        exam_questions.extend(five_mark)
        
        # 10-mark questions
        ten_mark = [p for p in predictions if p.marks == 10][:request.marks_distribution.get('10_mark', 2)]
        exam_questions.extend(ten_mark)
        
        total_marks = sum(q.marks for q in exam_questions)
        estimated_time = (len(two_mark) * 3) + (len(five_mark) * 8) + (len(ten_mark) * 15)
        
        return {
            "exam_id": f"mock_{request.subject_code}_{datetime.now().timestamp()}",
            "subject_code": request.subject_code,
            "questions": [
                {
                    "question_id": f"q_{i}",
                    "text": q.question_text,
                    "marks": q.marks,
                    "predicted_probability": q.probability_score,
                    "confidence": q.confidence_level,
                    "key_points": q.key_points,
                    "estimated_time_minutes": 3 if q.marks == 2 else (8 if q.marks == 5 else 15)
                }
                for i, q in enumerate(exam_questions)
            ],
            "total_marks": total_marks,
            "estimated_time_minutes": estimated_time,
            "coverage_analysis": {
                "high_confidence_questions": len([q for q in exam_questions if q.confidence_level == 'high']),
                "medium_confidence_questions": len([q for q in exam_questions if q.confidence_level == 'medium']),
                "topic_coverage": list(set(topic for q in exam_questions for topic in q.topics))
            }
        }
    
    except Exception as e:
        logger.error(f"Mock exam error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate mock exam: {str(e)}")


@router.post("/mock-exam/submit")
async def submit_mock_exam_result(result_data: dict):
    """
    Submit mock exam results for tracking
    """
    _require_future_modules_enabled()
    # Would insert into practice_attempts table
    return {
        "attempt_id": f"attempt_{datetime.now().timestamp()}",
        "status": "recorded",
        "analytics": {
            "strong_areas": ["Arrays", "Basic Operations"],
            "weak_areas": ["Complex Algorithms"],
            "improvement_suggestions": ["Practice more graph problems"]
        }
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  FEEDBACK & SATISFACTION
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/feedback/prediction")
async def submit_prediction_feedback(feedback: FeedbackRequest):
    """
    Submit feedback on prediction accuracy
    """
    _require_future_modules_enabled()
    # Would insert into prediction_feedback table
    return {
        "feedback_id": f"feedback_{feedback.prediction_id}",
        "status": "recorded",
        "message": "Thank you for your feedback! It helps us improve our predictions."
    }


@router.get("/feedback/stats/{subject_code}")
async def get_prediction_stats(subject_code: str):
    """
    Get prediction accuracy statistics for a subject
    """
    _require_future_modules_enabled()
    # Would query prediction_accuracy_logs table
    return {
        "subject_code": subject_code,
        "total_predictions": 150,
        "accuracy_rate": 78.5,
        "high_confidence_accuracy": 92.3,
        "medium_confidence_accuracy": 65.4,
        "low_confidence_accuracy": 42.1,
        "student_satisfaction": 4.6,
        "last_updated": datetime.now().isoformat()
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def _get_mock_previous_papers(subject_code: str) -> List[dict]:
    """
    Get mock previous papers data for demonstration
    In production, this would query the database
    """
    # Return realistic mock data
    return [
        {
            "year": 2024,
            "exam_type": "semester",
            "exam_month": "December",
            "questions": [
                {"text": "Explain binary tree traversals with examples", "marks": 10, "unit": 3, "unit_importance": 1.0, "topics": ["Trees", "Binary Trees"]},
                {"text": "Describe stack operations and applications", "marks": 5, "unit": 1, "unit_importance": 0.9, "topics": ["Stack"]},
                {"text": "What is a linked list?", "marks": 2, "unit": 2, "unit_importance": 0.8, "topics": ["Linked List"]},
            ]
        },
        {
            "year": 2023,
            "exam_type": "semester",
            "exam_month": "May",
            "questions": [
                {"text": "Explain binary tree traversals with examples", "marks": 10, "unit": 3, "unit_importance": 1.0, "topics": ["Trees", "Binary Trees"]},
                {"text": "Compare array and linked list", "marks": 5, "unit": 2, "unit_importance": 0.85, "topics": ["Arrays", "Linked List"]},
                {"text": "What is a queue?", "marks": 2, "unit": 1, "unit_importance": 0.8, "topics": ["Queue"]},
            ]
        },
        {
            "year": 2023,
            "exam_type": "supply",
            "exam_month": "August",
            "questions": [
                {"text": "Explain AVL tree rotations", "marks": 10, "unit": 3, "unit_importance": 0.95, "topics": ["AVL Tree"]},
                {"text": "Describe DFS and BFS", "marks": 5, "unit": 5, "unit_importance": 0.7, "topics": ["Graphs", "Traversal"]},
            ]
        },
        {
            "year": 2022,
            "exam_type": "semester",
            "exam_month": "December",
            "questions": [
                {"text": "Explain binary tree traversals with examples", "marks": 10, "unit": 3, "unit_importance": 1.0, "topics": ["Trees", "Binary Trees"]},
                {"text": "Describe stack operations and applications", "marks": 5, "unit": 1, "unit_importance": 0.9, "topics": ["Stack"]},
                {"text": "What is hashing?", "marks": 2, "unit": 4, "unit_importance": 0.75, "topics": ["Hashing"]},
            ]
        }
    ]


async def _add_ai_explanations(
    predictions: List[PredictionResult],
    subject_code: str
) -> List[PredictionResult]:
    """
    Add AI-generated explanations to predictions
    """
    # Get subject name
    from data.seed_data import SUBJECTS
    subject = next((s for s in SUBJECTS if s['subject_code'] == subject_code), None)
    subject_name = subject['subject_name'] if subject else subject_code
    
    for pred in predictions[:5]:  # Limit to top 5 for API efficiency
        try:
            prompt = f"""
            Subject: {subject_name}
            Question: {pred.question_text}
            Marks: {pred.marks}
            Probability: {pred.probability_score}%
            
            Provide a brief explanation (2-3 sentences) of why this question is predicted to appear in the exam.
            Focus on historical patterns and exam trends.
            """
            
            explanation = await call_text_model(
                prompt=prompt,
                model="meta/llama-3.2-90b-vision-instruct",
                max_tokens=150
            )
            
            pred.ai_explanation = explanation.strip()
        
        except Exception as e:
            logger.warning(f"Failed to generate AI explanation: {e}")
            pred.ai_explanation = None
    
    return predictions


from datetime import datetime
