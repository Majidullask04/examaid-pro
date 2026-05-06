-- ============================================
-- ExamAid Pro 2.0 - Prediction System Schema
-- ============================================

-- Previous year papers table
CREATE TABLE public.previous_papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    year INTEGER NOT NULL,
    exam_type TEXT NOT NULL CHECK (exam_type IN ('mid1', 'mid2', 'semester', 'supply')),
    exam_month TEXT,
    paper_code TEXT,
    total_marks INTEGER DEFAULT 75,
    duration_minutes INTEGER DEFAULT 180,
    paper_url TEXT,
    solution_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enhanced questions table with prediction data
CREATE TABLE public.question_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    answer_text TEXT,
    marks INTEGER NOT NULL CHECK (marks IN (2, 5, 10)),
    
    -- Prediction metrics
    probability_score DECIMAL(5,2) NOT NULL CHECK (probability_score >= 0 AND probability_score <= 100),
    confidence_level TEXT NOT NULL CHECK (confidence_level IN ('high', 'medium', 'low')),
    prediction_reason TEXT,
    
    -- Historical data
    times_appeared INTEGER DEFAULT 0,
    last_appeared_year INTEGER,
    last_appeared_exam TEXT,
    appearance_frequency DECIMAL(5,2), -- percentage over last 5 years
    
    -- Topic mapping
    topics JSONB DEFAULT '[]',
    related_previous_questions JSONB DEFAULT '[]',
    
    -- Metadata
    question_type TEXT CHECK (question_type IN ('theory', 'numerical', 'diagram', 'essay')),
    difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    estimated_time_minutes INTEGER,
    
    -- AI analysis
    ai_analysis JSONB,
    key_points JSONB DEFAULT '[]',
    common_mistakes JSONB DEFAULT '[]',
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Student profiles (extends auth.users)
CREATE TABLE public.student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    
    -- Academic info
    branch TEXT CHECK (branch IN ('CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL')),
    year INTEGER CHECK (year IN (1, 2, 3, 4)),
    semester INTEGER CHECK (semester IN (1, 2)),
    regulation TEXT DEFAULT 'R22',
    
    -- Learning preferences
    study_goal TEXT DEFAULT 'high_marks' CHECK (study_goal IN ('pass', 'high_marks', 'top_rank')),
    daily_study_minutes INTEGER DEFAULT 120,
    preferred_study_time TEXT CHECK (preferred_study_time IN ('morning', 'afternoon', 'evening', 'night')),
    
    -- Progress tracking
    total_study_hours DECIMAL(10,2) DEFAULT 0,
    questions_practiced INTEGER DEFAULT 0,
    mock_exams_taken INTEGER DEFAULT 0,
    average_mock_score DECIMAL(5,2) DEFAULT 0,
    
    -- Subscription
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'pro')),
    subscription_expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Study sessions tracking
CREATE TABLE public.study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    
    session_type TEXT NOT NULL CHECK (session_type IN ('reading', 'practice', 'mock_exam', 'revision')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    
    -- Content studied
    topics_covered JSONB DEFAULT '[]',
    questions_attempted INTEGER DEFAULT 0,
    questions_correct INTEGER DEFAULT 0,
    
    -- Self-reported metrics
    focus_level INTEGER CHECK (focus_level >= 1 AND focus_level <= 5),
    understanding_level INTEGER CHECK (understanding_level >= 1 AND understanding_level <= 5),
    notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Practice attempts / Mock exam results
CREATE TABLE public.practice_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    
    attempt_type TEXT NOT NULL CHECK (attempt_type IN ('mock_exam', 'previous_paper', 'practice_questions')),
    
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    
    -- Scores
    total_questions INTEGER NOT NULL,
    attempted_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    total_marks INTEGER,
    obtained_marks INTEGER,
    percentage DECIMAL(5,2),
    
    -- Question breakdown
    questions_data JSONB DEFAULT '[]', -- [{question_id, correct, time_taken, confidence}]
    
    -- Analysis
    strong_topics JSONB DEFAULT '[]',
    weak_topics JSONB DEFAULT '[]',
    time_analysis JSONB, -- {avg_time_per_question, time_pressure_areas}
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Student topic mastery tracking
CREATE TABLE public.topic_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
    topic_name TEXT NOT NULL,
    
    mastery_level DECIMAL(5,2) DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 100),
    questions_attempted INTEGER DEFAULT 0,
    questions_correct INTEGER DEFAULT 0,
    accuracy_rate DECIMAL(5,2) DEFAULT 0,
    
    last_studied_at TIMESTAMPTZ,
    next_review_at TIMESTAMPTZ, -- For spaced repetition
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE(student_id, subject_id, topic_name)
);

-- Student feedback on predictions
CREATE TABLE public.prediction_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE NOT NULL,
    question_prediction_id UUID REFERENCES public.question_predictions(id) ON DELETE CASCADE NOT NULL,
    
    -- Feedback
    appeared_in_exam BOOLEAN,
    prediction_accuracy_rating INTEGER CHECK (prediction_accuracy_rating >= 1 AND prediction_accuracy_rating <= 5),
    usefulness_rating INTEGER CHECK (usefulness_rating >= 1 AND usefulness_rating <= 5),
    feedback_text TEXT,
    
    -- Exam context
    exam_year INTEGER,
    exam_type TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prediction accuracy tracking (for system improvement)
CREATE TABLE public.prediction_accuracy_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    question_prediction_id UUID REFERENCES public.question_predictions(id) ON DELETE CASCADE,
    
    predicted_probability DECIMAL(5,2) NOT NULL,
    actual_appeared BOOLEAN NOT NULL,
    prediction_correct BOOLEAN GENERATED ALWAYS AS (
        (predicted_probability >= 50 AND actual_appeared) OR 
        (predicted_probability < 50 AND NOT actual_appeared)
    ) STORED,
    
    exam_year INTEGER NOT NULL,
    exam_type TEXT NOT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Student study plans
CREATE TABLE public.study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    
    plan_name TEXT NOT NULL,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('exam_prep', 'revision', 'quick_review', 'full_coverage')),
    
    -- Timeframe
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL,
    
    -- Content
    planned_topics JSONB DEFAULT '[]',
    planned_questions JSONB DEFAULT '[]',
    
    -- Progress
    completion_percentage DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_completed BOOLEAN DEFAULT false,
    
    -- AI generated
    ai_generated BOOLEAN DEFAULT false,
    ai_confidence DECIMAL(5,2),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily study plan items
CREATE TABLE public.study_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_plan_id UUID REFERENCES public.study_plans(id) ON DELETE CASCADE NOT NULL,
    
    planned_date DATE NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('topic', 'question', 'mock_exam', 'revision')),
    item_id UUID, -- References topic/question ID
    item_name TEXT NOT NULL,
    
    estimated_time_minutes INTEGER,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    actual_time_minutes INTEGER,
    
    notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.previous_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_accuracy_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plan_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Previous papers: Public read, admin write
CREATE POLICY "Previous papers are viewable by all"
    ON public.previous_papers FOR SELECT USING (true);
    
CREATE POLICY "Only admins can manage previous papers"
    ON public.previous_papers FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Question predictions: Public read, admin write
CREATE POLICY "Predictions are viewable by all authenticated users"
    ON public.question_predictions FOR SELECT USING (auth.role() = 'authenticated');
    
CREATE POLICY "Only admins can manage predictions"
    ON public.question_predictions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Student profiles: User owns their data
CREATE POLICY "Students can view own profile"
    ON public.student_profiles FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Students can update own profile"
    ON public.student_profiles FOR UPDATE USING (auth.uid() = user_id);
    
CREATE POLICY "Users can create own profile"
    ON public.student_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Study sessions: User owns their data
CREATE POLICY "Students can view own study sessions"
    ON public.study_sessions FOR SELECT USING (
        student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
    );
    
CREATE POLICY "Students can create own study sessions"
    ON public.study_sessions FOR INSERT WITH CHECK (
        student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
    );
    
CREATE POLICY "Students can update own study sessions"
    ON public.study_sessions FOR UPDATE USING (
        student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
    );

-- Practice attempts: User owns their data
CREATE POLICY "Students can view own practice attempts"
    ON public.practice_attempts FOR SELECT USING (
        student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
    );
    
CREATE POLICY "Students can create own practice attempts"
    ON public.practice_attempts FOR INSERT WITH CHECK (
        student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
    );

-- Topic mastery: User owns their data
CREATE POLICY "Students can view own topic mastery"
    ON public.topic_mastery FOR SELECT USING (
        student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
    );
    
CREATE POLICY "System can update topic mastery"
    ON public.topic_mastery FOR ALL USING (true);

-- Prediction feedback: User owns their data
CREATE POLICY "Students can view own feedback"
    ON public.prediction_feedback FOR SELECT USING (
        student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
    );
    
CREATE POLICY "Students can create feedback"
    ON public.prediction_feedback FOR INSERT WITH CHECK (
        student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
    );

-- Study plans: User owns their data
CREATE POLICY "Students can view own study plans"
    ON public.study_plans FOR SELECT USING (
        student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
    );
    
CREATE POLICY "Students can manage own study plans"
    ON public.study_plans FOR ALL USING (
        student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
    );

-- Study plan items: User owns their data
CREATE POLICY "Students can view own study plan items"
    ON public.study_plan_items FOR SELECT USING (
        study_plan_id IN (
            SELECT id FROM public.study_plans WHERE student_id IN (
                SELECT id FROM public.student_profiles WHERE user_id = auth.uid()
            )
        )
    );
    
CREATE POLICY "Students can manage own study plan items"
    ON public.study_plan_items FOR ALL USING (
        study_plan_id IN (
            SELECT id FROM public.study_plans WHERE student_id IN (
                SELECT id FROM public.student_profiles WHERE user_id = auth.uid()
            )
        )
    );

-- Create indexes
CREATE INDEX idx_question_predictions_subject ON public.question_predictions(subject_id);
CREATE INDEX idx_question_predictions_confidence ON public.question_predictions(confidence_level, probability_score DESC);
CREATE INDEX idx_question_predictions_unit ON public.question_predictions(unit_id);
CREATE INDEX idx_practice_attempts_student ON public.practice_attempts(student_id);
CREATE INDEX idx_practice_attempts_subject ON public.practice_attempts(subject_id);
CREATE INDEX idx_study_sessions_student ON public.study_sessions(student_id);
CREATE INDEX idx_topic_mastery_student ON public.topic_mastery(student_id, subject_id);
CREATE INDEX idx_study_plan_items_plan ON public.study_plan_items(study_plan_id);
CREATE INDEX idx_prediction_feedback_question ON public.prediction_feedback(question_prediction_id);

-- Triggers for updated_at
CREATE TRIGGER update_question_predictions_updated_at
    BEFORE UPDATE ON public.question_predictions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    
CREATE TRIGGER update_student_profiles_updated_at
    BEFORE UPDATE ON public.student_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    
CREATE TRIGGER update_topic_mastery_updated_at
    BEFORE UPDATE ON public.topic_mastery
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    
CREATE TRIGGER update_study_plans_updated_at
    BEFORE UPDATE ON public.study_plans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
