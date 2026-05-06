# ExamAid Pro 2.0 - Architecture Document

## System Overview
AI-powered exam preparation platform that predicts high-probability questions based on previous year paper analysis.

## Core Features

### 1. Smart Subject Discovery
- Upload syllabus image → AI extracts subject & topics
- Manual subject search with autocomplete
- Auto-mapping to JNTUH R22 curriculum

### 2. Question Prediction Engine
- Statistical analysis of 5+ years of previous papers
- ML-based probability scoring per question
- Confidence levels: HIGH (>80%), MEDIUM (50-80%), LOW (<50%)
- Topic-wise probability heatmaps

### 3. Personalized Study Plans
- Time-based adaptive planning (1 week / 1 month / full semester)
- Student performance tracking
- Weak area identification
- Spaced repetition recommendations

### 4. Practice & Mock Exams
- AI-generated mock tests based on predictions
- Previous year paper practice
- Timed test simulations
- Instant scoring & review

### 5. Student Satisfaction System
- Post-exam feedback collection
- Prediction accuracy tracking
- Continuous model improvement

## Technical Architecture

### Database Schema

#### Core Tables
- `subjects`: JNTUH subjects with metadata
- `units`: Units per subject
- `topics`: Topics per unit
- `previous_papers`: Actual previous year papers
- `questions`: Individual questions with metadata
- `question_predictions`: AI predictions with confidence

#### Student Tables
- `student_profiles`: Extended student data
- `study_sessions`: Track study time
- `practice_attempts`: Mock exam attempts
- `student_feedback`: Ratings & reviews

#### Analytics Tables
- `prediction_accuracy`: Track prediction success
- `topic_mastery`: Student mastery per topic
- `exam_results`: Actual exam outcomes

### AI Pipeline (5-Phase)

1. **Vision/Syllabus Parse**: Extract subject from image/text
2. **Data Retrieval**: Fetch previous papers from DB
3. **Statistical Analysis**: Calculate question probabilities
4. **Prediction Generation**: ML model + Rule-based scoring
5. **Plan Optimization**: Personalized study plan

### API Structure

```
/api/v2/
  /subjects
  /subjects/{id}/predictions
  /subjects/{id}/study-plan
  /student/profile
  /student/progress
  /practice/mock-exam
  /practice/previous-papers
  /feedback/rate-prediction
```

## Frontend Architecture

### Pages
1. **Landing**: Value proposition + demo
2. **Dashboard**: Progress overview + quick actions
3. **Subject Discovery**: Search/Upload → Select
4. **Predictions**: Visual question cards with probability
5. **Study Mode**: Active learning interface
6. **Mock Exams**: Test simulation
7. **Analytics**: Progress tracking

### Components
- `PredictionCard`: Shows question + probability + confidence
- `StudyTimer`: Pomodoro-style study tracker
- `ProgressChart`: Visual progress indicators
- `MockExamInterface`: Test-taking UI
- `FeedbackModal`: Rating & feedback collection

## Success Metrics
- **Prediction Accuracy**: >75% of predicted questions appear in exam
- **Student Satisfaction**: >4.5/5 rating
- **Engagement**: Average 3+ sessions per week
- **Exam Performance**: Improved scores for active users
