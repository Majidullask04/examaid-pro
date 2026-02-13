# 🎓 ExamAid Pro
### AI-Powered JNTUH Exam Preparation System

[![Status](https://img.shields.io/badge/status-production-green)]()
[![Tech Stack](https://img.shields.io/badge/stack-React%20%7C%20TypeScript%20%7C%20Supabase%20%7C%20AI-orange)]()

**ExamAid Pro** is an intelligent exam preparation platform specifically engineered for **JNTUH (Jawaharlal Nehru Technological University Hyderabad)** students. It uses a sophisticated **4-layer AI pipeline** to analyze any syllabus, predict exam questions with statistical confidence, and generate personalized study plans.

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
│  LAYER 1: VISION (Qwen 2.5 VL 7B)                               │
│  ├── Input: Syllabus image/PDF                                   │
│  ├── Output: Structured JSON (units, topics, keywords)          │
│  └── Feature: Multi-language OCR, handwriting support           │
│                                                                  │
│  LAYER 2: SEARCH (Perplexity API)                               │
│  ├── Query: "JNTUH R22 [Subject] Previous Papers"               │
│  ├── Gathering: 4-6 years of exam data                          │
│  └── Output: Raw question banks, important questions            │
│                                                                  │
│  LAYER 3: FUSION (Gemini 2.0 Flash)                             │
│  ├── Processing: Chunked by unit (prevents truncation)          │
│  ├── Cleaning: Remove noise, extract valid questions          │
│  ├── Checkpoint: Save after each unit                           │
│  └── Output: Clean, structured question dataset                  │
│                                                                  │
│  LAYER 4: BRAIN (DeepSeek R1)                                   │
│  ├── Analysis: Statistical pattern recognition                  │
│  ├── Prediction: Confidence-scored question forecast            │
│  ├── Validation: 47-point blueprint compliance                │
│  └── Output: Final exam predictions + study plan               │
│                                                                  │
│  SAFETY SYSTEMS:                                                 │
│  ├── CorruptionGuard: Language validation (EN only)            │
│  ├── CheckpointManager: Recovery from failures                 │
│  ├── TokenBudget: Pre-calculation to prevent truncation        │
│  └── FallbackEngine: Template predictions if AI fails          │
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
| **AI/ML** | DeepSeek R1, Gemini 2.0, Qwen VL | Prediction & analysis |
| **Backend** | Supabase Edge Functions (Deno) | Serverless API layer |
| **Database** | Supabase PostgreSQL | Checkpoint storage |
| **Search** | Perplexity API | Real-time exam data |
| **Validation** | Zod + Pydantic | Schema enforcement |

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- Supabase CLI (for edge functions)
- API keys: DeepSeek, Gemini, Qwen, Perplexity

### Installation

```bash
# 1. Clone repository
git clone https://github.com/Majidullask04/examaid-pro.git
cd examaid-pro

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local with your API keys

# 4. Start development
npm run dev

# 5. Deploy edge functions (separate terminal)
supabase functions deploy
```
