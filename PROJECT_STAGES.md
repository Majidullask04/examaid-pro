# ExamAid Pro Project Stages

This repo is organized around a simple rule:

- **NOW**: stable student utility.
- **LATER**: advanced architecture that is valuable, but not part of the MVP.

The near-term product is not an AI orchestration demo. It is a fast JNTUH study tool built around previous papers, important questions, exam-ready answers, and saved notes.

## NOW: Active MVP

These files and modules should stay active while the core workflow is stabilized.

### Frontend

- `src/pages/Index.tsx`
- `src/pages/Auth.tsx`
- `src/pages/SubjectSelector.tsx`
- `src/pages/Predictions.tsx`
- `src/pages/Subjects.tsx`
- `src/pages/SubjectUnits.tsx`
- `src/pages/UnitQuestions.tsx`
- `src/components/AIBrowser.tsx`
- `src/components/StudyNotes.tsx`
- `src/lib/api.ts`
- `src/services/aiService.ts`

### Backend

- `backend/main.py`
- `backend/api/v2_routes.py`
- `backend/services/ai_service.py`
- `backend/services/prediction_engine.py`
- `backend/data/models.py`
- `backend/data/seed_data.py`
- `backend/data/frequency_engine.py`
- `backend/bootstrap.py`

### MVP Data Model

Keep the active schema focused on:

- users
- previous papers / real questions
- question predictions
- saved notes

Advanced mastery, gamification, analytics, study sessions, mock exam scoring, and satisfaction systems are future work.

## LATER: Parked Modules

These ideas can remain in the repo as references, but they should not drive the MVP flow yet.

- multi-model AI orchestration
- NVIDIA vision chains
- OpenRouter fallback chains
- complex pipeline phases
- RAG / embeddings / vector DB
- advanced analytics
- mastery tracking
- gamification
- mock exam scoring
- production growth metrics

Relevant parked files:

- `backend/pipeline/*`
- `backend/services/nvidia_client.py`
- `backend/services/openrouter_client.py`
- `backend/services/ai_pipeline.py`
- `backend/strategies/*`
- advanced endpoints in `backend/api/v2_routes.py`
- detailed future architecture notes in `ARCHITECTURE.md`

## Development Order

### Week 1: Stabilize AI

- Use exactly one active AI entrypoint: `backend/services/ai_service.py`.
- Return structured JSON for exam answers:

```json
{
  "title": "",
  "definition": "",
  "important_points": [],
  "exam_answer": ""
}
```

- Retry invalid, incomplete, or timed-out model responses.
- Show friendly student-facing errors such as `Temporary AI issue. Please retry.`

### Week 2: Build Academic Value

- Manually add 5 subjects.
- Add 5 years of previous papers per subject.
- Simplify prediction logic to:
  - repeated count
  - last appearance
  - unit importance

### Week 3: Student Usability

- saved notes
- search
- mobile polish
- fast loading
- revision mode

### Week 4: Student Testing

Share with classmates, WhatsApp groups, juniors, and seniors. Track what answers are bad, what predictions feel useful, and which feature actually helps revision.

## UX Language

Use simple, believable status labels:

- `Analyzing previous papers...`
- `Generating exam-focused answers...`
- `Preparing important questions...`

Avoid presenting internal AI phase names as product value.
