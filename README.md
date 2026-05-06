# 🎓 ExamAid Pro
### AI-Powered JNTUH Exam Preparation System

[![Status](https://img.shields.io/badge/status-production-green)]()
[![Tech Stack](https://img.shields.io/badge/stack-React%20%7C%20TypeScript%20%7C%20FastAPI%20%7C%20AI-orange)]()

**ExamAid Pro** is an exam preparation platform for **JNTUH (Jawaharlal Nehru Technological University Hyderabad)** students. The current MVP focuses on subject selection, previous-paper frequency, important questions, exam-ready answers, and saved notes.

> Current development focus: stable student utility first. See `PROJECT_STAGES.md` for the active `NOW` plan and parked `LATER` modules.

## 🎨 Dark Theme UI

ExamAid Pro features a consistent dark theme across the entire platform for optimal readability and reduced eye strain during study sessions.

### Dark Theme Features
- **Slate color palette** (`bg-slate-950/900/800/700`) throughout all pages
- **High-contrast white text** (`text-white`, `text-slate-200/300/400`) for all content
- **Consistent card styling** with `border-slate-700` and `bg-slate-800/900`
- **Badge colors updated** for dark backgrounds (emerald-400, blue-400, yellow-400, red-400)
- **Fully dark JNTUH analysis page** with visible topic cards and unit sections
- **Dark prediction cards** with proper probability score visibility
- **Accessible pipeline status colors** with light variants for dark mode

---

## 🌟 Key Features

### 1. **Universal Syllabus Analysis**
- **Any Subject**: Works for CSE (FLAT, CD, CNS), ECE, MECH, CIVIL, etc.
- **Any Regulation**: R16, R18, R22, R23
- **Auto-Detection**: Automatically identifies 3, 4, or 5-unit structures
- **Multi-Language OCR**: Qwen 2.5 VL extracts text from any syllabus image/PDF

### 2. **AI-Powered Prediction Engine**
- **4-Layer Pipeline**: Vision → Search → Fusion → Brain
- **Statistical Analysis**: 6-year historical pattern recognition (2019-2024)
- **Confidence Scoring**: 0-100% with evidence-based reasoning
- **Zero Data Loss**: Checkpoint recovery ensures complete outputs

### 3. **Corruption-Proof Output**
- **Language Enforcement**: English-only, no hallucinated characters
- **Schema Validation**: Strict JSON mode prevents truncation
- **Fallback System**: Template-based predictions if AI fails
- **Sanitization**: Automatic removal of corrupted tokens

### 4. **Exam-Focused Deliverables**
- **Part-A Predictions**: 10 questions (2 marks each) with unit distribution
- **Part-B Predictions**: 5 units with either-or choices (10 marks)
- **12-Day Study Plan**: Prioritized by confidence scores
- **Just Pass Mode**: Essential topics for minimum passing marks

---
🔗 **Live Demo**: [https://knightsky.dpdns.org/](https://knightsky.dpdns.org/)

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXAMAID PRO PIPELINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  LAYER 1: VISION (Nemotron Nano VL via OpenRouter)             │
│  ├── Input: Syllabus image/PDF                                  │
│  ├── Output: OCR + subject summary                              │
│  └── Feature: Single-key image understanding                    │
│                                                                  │
│  LAYER 2: SEARCH (DuckDuckGo + page fetch)                     │
│  ├── Query: "JNTUH R22 [Subject] Previous Papers"              │
│  ├── Gathering: Free web retrieval                              │
│  └── Output: Raw question-bank text                             │
│                                                                  │
│  LAYER 3: ANALYSIS (GLM 4.5 Air via OpenRouter)                │
│  ├── Processing: Map web evidence back to syllabus topics       │
│  ├── Cleaning: Conservative JSON scoring                        │
│  └── Output: Topic frequency index                              │
│                                                                  │
│  LAYER 4: BRAIN (Local strategy engine)                        │
│  ├── Analysis: Deterministic pass/high-marks rules              │
│  ├── Prediction: Stable study-plan JSON                         │
│  └── Output: Final exam strategy                                │
│                                                                  │
│  LAYER 5: PREP (Local formatter)                               │
│  ├── Formatting: Deterministic PDF text                         │
│  └── Output: Download-ready study guide                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + Vite | Fast, interactive UI |
| **Language** | TypeScript | Type safety across stack |
| **Styling** | Tailwind CSS + shadcn-ui | Modern, responsive design |
| **AI/ML** | Gemini Flash | Structured exam-ready answers |
| **Backend** | FastAPI + Python | Unified API and frontend hosting |
| **Database** | SQLite + Supabase | Local study-plan data + user data |
| **Prediction** | Statistical frequency logic | Repeated count, last appearance, unit importance |
| **Validation** | Zod + Pydantic | Schema enforcement |

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- Python ≥ 3.11
- API keys: Gemini

### Installation

```bash
# 1. Clone repository
git clone https://github.com/Majidullask04/examaid-pro.git
cd examaid-pro

# 2. Install dependencies
npm install

# 3. Configure frontend env
# edit .env for Supabase/browser settings if needed

# 4. Configure backend env
# add GEMINI_API_KEY in backend/.env or repo .env

# 5. Start the backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 6. Start the frontend (separate terminal from repo root)
npm run dev
```
