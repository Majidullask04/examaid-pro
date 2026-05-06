"""
MVP question prediction engine.

The active version deliberately stays statistical: repeated count, last
appearance, and unit importance. Advanced ML/embedding logic belongs later.
"""
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime


@dataclass
class PredictionResult:
    question_text: str
    probability_score: float
    confidence_level: str  # high, medium, low
    prediction_reason: str
    times_appeared: int
    last_appeared_year: Optional[int]
    appearance_frequency: float
    marks: int
    topics: List[str]
    key_points: List[str]
    common_mistakes: List[str]
    unit: Optional[int] = None


class QuestionPredictionEngine:
    """
    Predicts exam questions using statistical analysis of previous papers
    """
    
    def __init__(self):
        self.high_confidence_threshold = 80.0
        self.medium_confidence_threshold = 50.0
        self.years_window = 5  # Consider last 5 years
        
    def calculate_probability_score(
        self,
        times_appeared: int,
        total_papers: int,
        last_appeared_year: Optional[int],
        unit_importance: float = 1.0
    ) -> float:
        """
        Calculate probability score (0-100) from simple academic signals.
        """
        if total_papers == 0:
            return 0.0

        repeated_count_score = (times_appeared / total_papers) * 70

        recency_bonus = 0.0
        if last_appeared_year:
            years_ago = datetime.now().year - last_appeared_year
            if years_ago <= 1:
                recency_bonus = 15
            elif years_ago == 2:
                recency_bonus = 10
            elif years_ago == 3:
                recency_bonus = 5

        unit_score = max(0, min(unit_importance, 1.0)) * 15
        final_score = repeated_count_score + recency_bonus + unit_score
        return min(final_score, 100.0)
    
    def determine_confidence_level(self, probability_score: float, sample_size: int) -> str:
        """
        Determine confidence level based on probability and sample size
        """
        if sample_size < 3:
            return "low"
        
        if probability_score >= self.high_confidence_threshold:
            return "high"
        elif probability_score >= self.medium_confidence_threshold:
            return "medium"
        else:
            return "low"
    
    def generate_prediction_reason(
        self,
        times_appeared: int,
        last_appeared_year: Optional[int],
        unit: Optional[int],
        marks: int
    ) -> str:
        """
        Generate human-readable prediction reason
        """
        reasons = []
        
        if times_appeared >= 3:
            reasons.append(f"Appeared {times_appeared} times in last {self.years_window} years")
        
        if last_appeared_year:
            years_ago = datetime.now().year - last_appeared_year
            if years_ago <= 1:
                reasons.append("Appeared recently")
            elif years_ago == 2:
                reasons.append("Appeared 2 years ago (due for repeat)")

        if unit:
            reasons.append(f"Belongs to Unit {unit}, useful for unit-wise preparation")
        
        if marks == 2:
            reasons.append("High-frequency 2-mark question")
        elif marks == 10:
            reasons.append("Important 10-mark essay topic")
        
        return "; ".join(reasons) if reasons else "Based on syllabus pattern analysis"
    
    def predict_questions_for_subject(
        self,
        subject_code: str,
        previous_papers: List[Dict],
        syllabus_topics: List[str],
        exam_type: str = "semester"
    ) -> List[PredictionResult]:
        """
        Generate predictions for a subject based on previous papers
        """
        predictions = []
        
        # Group questions by similarity
        question_groups = self._group_similar_questions(previous_papers)
        
        total_papers = len(set(f"{p['year']}_{p['exam_type']}" for p in previous_papers))
        
        for question_group in question_groups:
            appearances = question_group['appearances']
            times_appeared = len(appearances)
            
            # Get most recent appearance
            sorted_appearances = sorted(
                appearances,
                key=lambda x: (x['year'], x.get('exam_month', '')),
                reverse=True
            )
            last_appeared = sorted_appearances[0] if sorted_appearances else None
            last_appeared_year = last_appeared['year'] if last_appeared else None
            
            # Calculate probability
            probability = self.calculate_probability_score(
                times_appeared=times_appeared,
                total_papers=max(total_papers, 1),
                last_appeared_year=last_appeared_year,
                unit_importance=question_group.get('unit_importance', 1.0)
            )
            
            # Determine confidence
            confidence = self.determine_confidence_level(probability, times_appeared)
            
            # Generate reason
            reason = self.generate_prediction_reason(
                times_appeared=times_appeared,
                last_appeared_year=last_appeared_year,
                unit=question_group.get('unit'),
                marks=question_group['marks']
            )
            
            # Extract key points using AI (if available)
            key_points = question_group.get('key_points', [])
            common_mistakes = question_group.get('common_mistakes', [])
            
            prediction = PredictionResult(
                question_text=question_group['question_text'],
                probability_score=round(probability, 2),
                confidence_level=confidence,
                prediction_reason=reason,
                times_appeared=times_appeared,
                last_appeared_year=last_appeared_year,
                appearance_frequency=round((times_appeared / max(total_papers, 1)) * 100, 2),
                marks=question_group['marks'],
                topics=question_group.get('topics', []),
                key_points=key_points,
                common_mistakes=common_mistakes,
                unit=question_group.get('unit')
            )
            
            predictions.append(prediction)
        
        # Sort by probability score descending
        predictions.sort(key=lambda x: x.probability_score, reverse=True)
        
        return predictions
    
    def _group_similar_questions(self, previous_papers: List[Dict]) -> List[Dict]:
        """
        Group similar questions from previous papers
        Uses simple text similarity (can be enhanced with embeddings)
        """
        from collections import defaultdict
        
        groups = defaultdict(lambda: {
            'appearances': [],
            'question_text': '',
            'marks': 0,
            'unit': None,
            'unit_importance': 1.0,
            'topics': [],
            'key_points': [],
            'common_mistakes': []
        })
        
        for paper in previous_papers:
            for question in paper.get('questions', []):
                # Create a key based on normalized question text
                normalized = self._normalize_question(question['text'])
                key = f"{normalized}_{question['marks']}"
                
                groups[key]['appearances'].append({
                    'year': paper['year'],
                    'exam_type': paper['exam_type'],
                    'exam_month': paper.get('exam_month', ''),
                    'question_text': question['text']
                })
                groups[key]['question_text'] = question['text']
                groups[key]['marks'] = question['marks']
                groups[key]['unit'] = question.get('unit')
                groups[key]['unit_importance'] = question.get('unit_importance', 1.0)
                groups[key]['topics'] = question.get('topics', [])
                
        return list(groups.values())
    
    def _normalize_question(self, text: str) -> str:
        """
        Normalize question text for grouping
        """
        # Remove extra whitespace, convert to lowercase
        normalized = ' '.join(text.lower().split())
        
        # Remove common prefixes
        prefixes = ['explain', 'describe', 'what is', 'define', 'compare', 'differentiate']
        for prefix in prefixes:
            if normalized.startswith(prefix):
                normalized = normalized[len(prefix):].strip()
        
        # Remove punctuation
        normalized = ''.join(c for c in normalized if c.isalnum() or c.isspace())
        
        return normalized[:100]  # Truncate for grouping
    
    def get_top_predictions(
        self,
        predictions: List[PredictionResult],
        confidence_filter: Optional[str] = None,
        marks_filter: Optional[int] = None,
        limit: int = 20
    ) -> List[PredictionResult]:
        """
        Filter and get top predictions
        """
        filtered = predictions
        
        if confidence_filter:
            filtered = [p for p in filtered if p.confidence_level == confidence_filter]
        
        if marks_filter:
            filtered = [p for p in filtered if p.marks == marks_filter]
        
        # Sort by probability
        filtered.sort(key=lambda x: x.probability_score, reverse=True)
        
        return filtered[:limit]
    
    def generate_smart_study_plan(
        self,
        predictions: List[PredictionResult],
        days_remaining: int,
        daily_hours: int = 3
    ) -> Dict:
        """
        Generate a smart study plan based on predictions
        """
        # Get high confidence questions first
        high_conf = [p for p in predictions if p.confidence_level == 'high']
        medium_conf = [p for p in predictions if p.confidence_level == 'medium']
        
        # Calculate total study time
        total_minutes = days_remaining * daily_hours * 60
        
        # Allocate time based on priority
        plan = {
            'total_days': days_remaining,
            'daily_hours': daily_hours,
            'total_questions': len(predictions),
            'high_priority_questions': len(high_conf),
            'phases': []
        }
        
        # Phase 1: High confidence questions (50% of time)
        phase1_minutes = total_minutes * 0.5
        phase1_questions = high_conf[:min(len(high_conf), 15)]
        
        plan['phases'].append({
            'name': 'Phase 1: Master High-Probability Questions',
            'duration_minutes': phase1_minutes,
            'questions': phase1_questions,
            'strategy': 'Focus on these first - 80%+ chance of appearing'
        })
        
        # Phase 2: Medium confidence questions (30% of time)
        phase2_minutes = total_minutes * 0.3
        phase2_questions = medium_conf[:min(len(medium_conf), 10)]
        
        plan['phases'].append({
            'name': 'Phase 2: Cover Medium-Probability Questions',
            'duration_minutes': phase2_minutes,
            'questions': phase2_questions,
            'strategy': 'Secondary priority - 50-80% chance'
        })
        
        # Phase 3: Revision and practice (20% of time)
        phase3_minutes = total_minutes * 0.2
        
        plan['phases'].append({
            'name': 'Phase 3: Revision & Mock Tests',
            'duration_minutes': phase3_minutes,
            'strategy': 'Practice weak areas and take mock tests'
        })
        
        return plan


# Singleton instance
prediction_engine = QuestionPredictionEngine()
