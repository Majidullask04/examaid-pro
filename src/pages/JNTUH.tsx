import { useState, useRef, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SyllabusUploader } from '@/components/SyllabusUploader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NeumorphicCard } from '@/components/neumorphic/NeumorphicCard';
import { StudyGoalToggle } from '@/components/neumorphic/StudyGoalToggle';
import { AnalysisPipeline } from '@/components/neumorphic/AnalysisPipeline';
import { PanicModeButton } from '@/components/neumorphic/PanicModeButton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useSyllabusAnalysis, PipelineStage } from '@/hooks/useSyllabusAnalysis';
import { apiUrl } from '@/lib/api';
import {
  Cpu, Radio, Zap, Cog, Building2, MonitorSmartphone, BrainCircuit, Database, Bot,
  ArrowLeft, Sparkles, Copy, Check, ImageIcon, FileText,
  ClipboardList, History, Download, ChevronDown,
  ChevronUp, BookOpen, Target, BarChart3, Clock
} from 'lucide-react';

interface Department {
  id: string;
  name: string;
  fullName: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  branchCode: string;
}

interface SubjectOption {
  id: string;
  name: string;
  code: string;
}

interface TopicItem {
  name: string;
  priority: string;
  frequency_score: number;
  consistency: string;
  trend: string;
  marks_history: { year: number; exam: string; marks: number }[];
  appeared_in: string;
  guaranteed: boolean;
  high_value?: boolean;
  question_type: string;
  what_to_focus_on: string;
  skip_reason?: string;
}

interface UnitPlan {
  unit_number: number;
  expected_marks: number | null;
  study_time_hours: number;
  data_confidence?: string;      // "none" | "partial" | "full"
  all_topics?: TopicItem[];      // used when data_confidence === "none"
  message?: string | null;
  // pass mode
  must_study_2mark?: TopicItem[];
  should_study_2mark?: TopicItem[];
  one_essay_topic?: TopicItem;
  skip_topics?: TopicItem[];
  // high marks mode
  tier_1_must_master?: TopicItem[];
  tier_2_should_know_well?: TopicItem[];
  tier_3_good_to_have?: TopicItem[];
  tier_4_skip_unless_time?: TopicItem[];
}

interface StudyPlan {
  meta: {
    subject_code: string;
    subject_name: string;
    branch: string;
    regulation?: string;
    generated_at?: string;
    goal: string;
    goal_display: string;
    model_used: string;
    cache_hit: boolean;
    papers_analyzed: number;
    data_confidence: string;     // "none" | "partial" | "full"
    index_status: string;        // "syllabus_only" | "partial_data" | "full_5year" | "live_synthesis"
    question_count: number;
  };
  summary: {
    total_topics_in_syllabus: number;
    topics_to_study: number;
    topics_to_skip: number;
    expected_marks_range: (number | null)[];
    study_time_estimate_hours: number;
    priority_units: number[];
    confidence_level: string;
    guaranteed_marks_count: number;
  };
  units: UnitPlan[];
  exam_strategy: Record<string, unknown>;
  warnings: string[];
  previous_year_questions: Record<string, PreviousQuestion[]>;
  pipeline_report?: PipelineReportItem[];
}

interface PreviousQuestion {
  question: string;
  marks: number;
  unit: number;
  topics_tagged?: string[];
}

interface PipelineReportItem {
  phase: number;
  name: string;
  status: 'complete' | 'warning' | 'error' | 'skipped';
  mode: 'live' | 'fallback' | 'local';
  message: string;
}

interface SyllabusInsight {
  rawText: string;
  detectedSubject?: string;
  matchedSubject?: SubjectOption | null;
}

type HighMarksTierKey =
  | 'tier_1_must_master'
  | 'tier_2_should_know_well'
  | 'tier_3_good_to_have'
  | 'tier_4_skip_unless_time';

const normalizeText = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const matchUploadedSubject = (subjects: SubjectOption[], detectedSubject?: string, analysisText?: string) => {
  const candidates = [detectedSubject, analysisText].filter(Boolean).map(value => normalizeText(value as string));
  if (!candidates.length) return null;

  const exactMatch = subjects.find(subject => {
    const normalizedName = normalizeText(subject.name);
    const normalizedCode = normalizeText(subject.code);
    return candidates.some(candidate =>
      candidate.includes(normalizedName) ||
      normalizedName.includes(candidate) ||
      candidate.includes(normalizedCode)
    );
  });

  if (exactMatch) return exactMatch;

  let bestMatch: SubjectOption | null = null;
  let bestScore = 0;

  for (const subject of subjects) {
    const subjectTokens = new Set(normalizeText(subject.name).split(' ').filter(Boolean));
    for (const candidate of candidates) {
      const overlap = candidate
        .split(' ')
        .filter(token => token && subjectTokens.has(token)).length;

      if (overlap > bestScore) {
        bestScore = overlap;
        bestMatch = subject;
      }
    }
  }

  return bestScore >= 2 ? bestMatch : null;
};

const departments: Department[] = [
  { id: 'cse', name: 'CSE', fullName: 'Computer Science & Engineering', icon: Cpu, description: 'Core CS fundamentals, programming, algorithms', branchCode: 'CSE' },
  { id: 'ece', name: 'ECE', fullName: 'Electronics & Communication', icon: Radio, description: 'Electronics, signals, communication systems', branchCode: 'ECE' },
  { id: 'eee', name: 'EEE', fullName: 'Electrical & Electronics', icon: Zap, description: 'Power systems, electrical machines, controls', branchCode: 'EEE' },
  { id: 'mech', name: 'MECH', fullName: 'Mechanical Engineering', icon: Cog, description: 'Thermodynamics, mechanics, manufacturing', branchCode: 'MECH' },
  { id: 'civil', name: 'CIVIL', fullName: 'Civil Engineering', icon: Building2, description: 'Structures, construction, surveying', branchCode: 'CIVIL' },
  { id: 'it', name: 'IT', fullName: 'Information Technology', icon: MonitorSmartphone, description: 'Software, networks, databases', branchCode: 'IT' },
  { id: 'csm', name: 'CSM', fullName: 'CS & Machine Learning', icon: BrainCircuit, description: 'AI, machine learning, deep learning', branchCode: 'CSM' },
  { id: 'csd', name: 'CSD', fullName: 'CS & Data Science', icon: Database, description: 'Big data, analytics, data engineering', branchCode: 'CSD' },
  { id: 'aids', name: 'AIDS', fullName: 'AI & Data Science', icon: Bot, description: 'Artificial intelligence, data science', branchCode: 'AIDS' },
];

const getSessionId = () => {
  let id = localStorage.getItem('jntuh_session_id');
  if (!id) {
    id = 'session_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('jntuh_session_id', id);
  }
  return id;
};

const getSavedDept = () => {
  const id = localStorage.getItem('jntuh_selected_dept');
  return id ? departments.find(d => d.id === id) || null : null;
};

// ─── Consistency badge ─────────────────────────────────────────────────────
const ConsistencyBadge = ({ value }: { value: string }) => {
  const map: Record<string, { color: string; icon: string }> = {
    LOCKED: { color: 'bg-emerald-500 text-white', icon: '🔒' },
    LIKELY: { color: 'bg-blue-500 text-white', icon: '📌' },
    POSSIBLE: { color: 'bg-yellow-500 text-white', icon: '⚡' },
    DORMANT: { color: 'bg-gray-400 text-white', icon: '💤' },
  };
  const cfg = map[value] || { color: 'bg-gray-400 text-white', icon: '' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0 rounded-full text-xs font-bold ${cfg.color}`}>
      {cfg.icon} {value}
    </span>
  );
};

const TrendBadge = ({ value }: { value: string }) => {
  const map: Record<string, string> = { RISING: '📈 RISING', STABLE: '➡️ STABLE', DECLINING: '📉 DECLINING' };
  const color = value === 'RISING' ? 'text-emerald-400' : value === 'DECLINING' ? 'text-red-400' : 'text-slate-400';
  return <span className={`text-xs font-semibold ${color}`}>{map[value] || value}</span>;
};

// ─── Topic Row Component ───────────────────────────────────────────────────
const TopicRow = ({ topic, showSkip = false }: { topic: TopicItem; showSkip?: boolean }) => {
  const [expanded, setExpanded] = useState(false);
  const isSkip = topic.priority === 'SKIP' || showSkip;

  return (
    <div className={`rounded-xl mb-2 overflow-hidden border-2 ${isSkip ? 'border-slate-700 bg-slate-800/60 opacity-70' : 'border-slate-600 bg-slate-800 text-white'}`}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left p-3 flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-lg shrink-0">{isSkip ? '❌' : topic.guaranteed ? '⚡' : '✅'}</span>
          <span className={`font-semibold text-sm truncate ${isSkip ? 'text-slate-400 line-through' : 'text-white'}`}>
            {topic.name}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ConsistencyBadge value={topic.consistency} />
          <span className="text-xs text-slate-400">{topic.appeared_in}</span>
          {expanded ? <ChevronUp className="h-3 w-3 text-slate-300" /> : <ChevronDown className="h-3 w-3 text-slate-300" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-3 space-y-1 border-t border-slate-700">
          <div className="flex gap-3 mt-2 flex-wrap">
            <TrendBadge value={topic.trend} />
            <span className="text-xs text-slate-400">Score: {topic.frequency_score}/100</span>
            <span className="text-xs text-slate-400">{topic.question_type}</span>
          </div>
          {topic.what_to_focus_on && (
            <p className="text-xs text-blue-400 mt-1 font-medium">💡 {topic.what_to_focus_on}</p>
          )}
          {topic.marks_history?.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-1">
              {topic.marks_history.map((h, i) => (
                <span key={i} className="text-xs bg-slate-700 text-white px-2 py-0.5 rounded-full border border-slate-600">
                  {h.year} {h.exam}: {h.marks}m
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Unit Card Component ──────────────────────────────────────────────────
const UnitCard = ({ unit, goal }: { unit: UnitPlan; goal: string }) => {
  const [open, setOpen] = useState(unit.unit_number <= 2);

  return (
    <NeumorphicCard className="overflow-hidden p-0 border border-slate-700">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 bg-slate-800/80 hover:bg-slate-700/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-blue-400 text-base">Unit {unit.unit_number}</span>
          <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
            {unit.expected_marks != null ? `~${unit.expected_marks}m expected` : 'N/A'}
          </Badge>
          <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-200"><Clock className="h-3 w-3 mr-1 inline" />{unit.study_time_hours}h</Badge>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-blue-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {open && (
        <div className="p-4 space-y-4">
          {unit.data_confidence === 'none' ? (
            /* ── NO DATA: list all topics neutrally ── */
            <div>
              {unit.message && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 mb-3">
                  <p className="text-xs text-yellow-300">📊 {unit.message}</p>
                </div>
              )}
              <p className="text-xs font-bold uppercase text-slate-400 mb-2">📖 Syllabus Topics (no priority data)</p>
              {(unit.all_topics || []).map((t, i) => <TopicRow key={i} topic={t} />)}
            </div>
          ) : goal === 'pass' ? (
            <>
              {(unit.must_study_2mark?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase text-emerald-400 mb-2">✅ Must Study (2-mark free marks)</p>
                  {unit.must_study_2mark!.map((t, i) => <TopicRow key={i} topic={t} />)}
                </div>
              )}
              {(unit.should_study_2mark?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase text-blue-400 mb-2">📌 Should Study</p>
                  {unit.should_study_2mark!.map((t, i) => <TopicRow key={i} topic={t} />)}
                </div>
              )}
              {unit.one_essay_topic && (
                <div>
                  <p className="text-xs font-bold uppercase text-purple-400 mb-2">📝 Essay Topic (10-mark)</p>
                  <TopicRow topic={unit.one_essay_topic} />
                </div>
              )}
              {(unit.skip_topics?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400 mb-2">⛔ Skip (low probability)</p>
                  {unit.skip_topics!.map((t, i) => <TopicRow key={i} topic={t} showSkip />)}
                </div>
              )}
            </>
          ) : (
            <>
              {(['tier_1_must_master', 'tier_2_should_know_well', 'tier_3_good_to_have', 'tier_4_skip_unless_time'] as HighMarksTierKey[]).map((tier, idx) => {
                const labels = ['🏆 Tier 1 — Must Master', '📘 Tier 2 — Know Well', '📗 Tier 3 — Good to Have', '⬜ Tier 4 — Skip if Short'];
                const colors = ['text-emerald-400', 'text-blue-400', 'text-yellow-400', 'text-slate-400'];
                const topics = unit[tier];
                if (!topics?.length) return null;
                return (
                  <div key={tier}>
                    <p className={`text-xs font-bold uppercase mb-2 ${colors[idx]}`}>{labels[idx]}</p>
                    {topics.map((t, i) => <TopicRow key={i} topic={t} showSkip={idx === 3} />)}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </NeumorphicCard>
  );
};

// ─── Previous Questions Tab ────────────────────────────────────────────────
const PreviousQuestionsTab = ({ data }: { data: Record<string, PreviousQuestion[]> }) => {
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const allExams = Object.keys(data).sort().reverse();

  const filtered = selectedYear === 'all'
    ? Object.entries(data)
    : Object.entries(data).filter(([k]) => k.startsWith(selectedYear));

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm" variant={selectedYear === 'all' ? 'default' : 'outline'}
          onClick={() => setSelectedYear('all')} className="h-8 text-xs"
        >All Years</Button>
        {['2024', '2023', '2022', '2021', '2020'].map(y => (
          <Button
            key={y} size="sm"
            variant={selectedYear === y ? 'default' : 'outline'}
            onClick={() => setSelectedYear(y)} className="h-8 text-xs"
          >{y}</Button>
        ))}
      </div>

      {filtered.length === 0 && (
        <NeumorphicCard variant="inset" className="py-8 text-center">
          <p className="text-muted-foreground text-sm">No previous questions loaded. Frequency index is built — questions appear as data grows.</p>
        </NeumorphicCard>
      )}

      {filtered.map(([examKey, questions]) => (
        <div key={examKey}>
          <p className="text-xs font-bold text-primary uppercase mb-2">🔵 {examKey.replace(/_/g, ' ')}</p>
          <div className="space-y-2">
            {questions.map((q, i) => (
              <NeumorphicCard key={i} variant="inset" className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium flex-1 text-white">{q.question}</p>
                  <Badge variant="outline" className="shrink-0 text-xs border-slate-600 text-slate-300">{q.marks}m</Badge>
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  <span className="text-xs text-slate-400">Unit {q.unit}</span>
                  {q.topics_tagged?.map((tag: string, ti: number) => (
                    <span key={ti} className="text-xs bg-blue-500/20 text-blue-400 px-2 rounded-full border border-blue-500/30">{tag}</span>
                  ))}
                </div>
              </NeumorphicCard>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};


// ─── MAIN COMPONENT ────────────────────────────────────────────────────────
export default function JNTUH() {
  const [selectedDept, setSelectedDept] = useState<Department | null>(getSavedDept);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SubjectOption | null>(null);
  const [studyGoal, setStudyGoal] = useState<'pass' | 'high_marks'>('pass');
  const [isSyllabusMode, setIsSyllabusMode] = useState(false);
  const [panicMode, setPanicMode] = useState(false);
  const [activeTab, setActiveTab] = useState('input');
  const [activeResultTab, setActiveResultTab] = useState('plan');
  const [isLoading, setIsLoading] = useState(false);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [pdfText, setPdfText] = useState('');
  const [syllabusInsight, setSyllabusInsight] = useState<SyllabusInsight | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sessionId] = useState(getSessionId);
  const resultRef = useRef<HTMLDivElement>(null);

  // ── SSE Pipeline Phase Tracking ──
  interface PhaseState {
    phase: number | string;
    status: 'waiting' | 'processing' | 'complete' | 'warning' | 'error';
    msg: string;
  }
  const [phases, setPhases] = useState<PhaseState[]>([
    { phase: 1, status: 'waiting', msg: 'Vision — Load syllabus or OCR image' },
    { phase: 2, status: 'waiting', msg: 'Search — Free web retrieval' },
    { phase: 3, status: 'waiting', msg: 'Analysis — RAG topic mapping' },
    { phase: 4, status: 'waiting', msg: 'Brain — Local strategy engine' },
    { phase: 5, status: 'waiting', msg: 'Prep — Deterministic PDF formatter' },
  ]);
  const [currentPhaseMsg, setCurrentPhaseMsg] = useState('');

  // Save dept selection
  useEffect(() => {
    if (selectedDept) localStorage.setItem('jntuh_selected_dept', selectedDept.id);
  }, [selectedDept]);

  // Load subjects from backend when dept changes
  useEffect(() => {
    if (!selectedDept) return;
    fetch(apiUrl(`/api/subjects/${selectedDept.branchCode}`))
      .then(r => r.json())
      .then(d => {
        if (d.subjects?.length) {
          setSubjects(d.subjects);
          if (d.warning) toast.warning(d.warning);
        } else {
          setSubjects([]);
        }
      })
      .catch(() => setSubjects([]));
  }, [selectedDept]);

  const resetPhases = () => {
    setPhases([
      { phase: 1, status: 'waiting', msg: 'Vision — Load syllabus or OCR image' },
      { phase: 2, status: 'waiting', msg: 'Search — Free web retrieval' },
      { phase: 3, status: 'waiting', msg: 'Analysis — RAG topic mapping' },
      { phase: 4, status: 'waiting', msg: 'Brain — Local strategy engine' },
      { phase: 5, status: 'waiting', msg: 'Prep — Deterministic PDF formatter' },
    ]);
    setCurrentPhaseMsg('');
  };

  const loadFallbackPlan = async (subject: SubjectOption, goal: 'pass' | 'high_marks', reason?: string) => {
    try {
      const response = await fetch(apiUrl(`/api/study-plan/${subject.code}/${goal}`));
      if (!response.ok) {
        throw new Error('Local fallback plan is unavailable');
      }

      const data = await response.json();
      setStudyPlan(data);
      setPdfText('');
      setActiveTab('results');
      toast.warning(reason ? `${reason}. Loaded the local fallback plan instead.` : 'Loaded the local fallback plan.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Local fallback failed';
      toast.error(message);
    } finally {
      setIsLoading(false);
      setCurrentPhaseMsg('');
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 400);
    }
  };

  const startLiveAnalysis = (subject: SubjectOption, goal: 'pass' | 'high_marks', preserveSyllabusInsight = false) => {
    setSelectedSubject(subject);
    setStudyGoal(goal);
    setIsLoading(true);
    setStudyPlan(null);
    setPdfText('');
    if (!preserveSyllabusInsight) {
      setSyllabusInsight(null);
    }
    resetPhases();
    setActiveTab('results');

    const url = apiUrl(`/api/analyze/stream/${subject.code}/${goal}`);
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.phase === 'cache_hit') {
          setCurrentPhaseMsg('⚡ Loading cached result...');
          toast.success('⚡ Cached! Loaded instantly.');
          return;
        }

        if (data.phase === 'done') {
          eventSource.close();
          if (data.plan && Object.keys(data.plan).length > 0) {
            setStudyPlan(data.plan);
            setPdfText(data.pdf_text || '');
            if (data.cached) {
              toast.success('⚡ Loaded from cache — $0 cost!');
            } else {
              toast.success(`✅ Plan ready! ${data.plan?.meta?.data_confidence === 'full' ? 'Full synthesis complete' : 'Analysis complete'}`);
            }
            setIsLoading(false);
            setCurrentPhaseMsg('');
            setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 400);
            return;
          }

          loadFallbackPlan(subject, goal, data.error || 'Live pipeline produced no results');
          return;
        }

        if (typeof data.phase === 'number') {
          setPhases(prev => prev.map(p =>
            p.phase === data.phase
              ? { ...p, status: data.status, msg: data.msg || p.msg }
              : p
          ));
          setCurrentPhaseMsg(data.msg || '');
        }
      } catch (error) {
        console.error('SSE parse error:', error);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      loadFallbackPlan(subject, goal, 'Connection to the live pipeline was interrupted');
    };
  };

  // Syllabus analysis hook
  const { analyzeSyllabus, isProcessing: syllabusProcessing, stage: syllabusStage, pipelineStage } = useSyllabusAnalysis({
    sessionId,
    selectedDepartment: selectedDept,
    panicMode,
    onSuccess: (fullText, subject) => {
      const matchedSubject = matchUploadedSubject(subjects, subject, fullText);
      setSyllabusInsight({
        rawText: fullText,
        detectedSubject: subject,
        matchedSubject,
      });

      if (matchedSubject) {
        toast.success(`Detected ${matchedSubject.name}. Starting the full study-plan pipeline...`);
        startLiveAnalysis(matchedSubject, studyGoal, true);
      } else {
        setStudyPlan(null);
        setPdfText('');
        setActiveTab('results');
        toast.success('Syllabus analyzed. Review the extracted summary below.');
      }
    }
  });

  const handleAnalyze = () => {
    if (!selectedDept) return toast.error('Please select a department');
    if (!selectedSubject) return toast.error('Please select a subject');

    startLiveAnalysis(selectedSubject, studyGoal);
  };

  const handleDownloadPdf = async () => {
    if (!studyPlan && !pdfText) return toast.error('No study plan to download');
    setIsPdfLoading(true);
    try {
      const res = await fetch(apiUrl('/api/pdf/text'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_name: studyPlan?.meta?.subject_name || selectedSubject?.name || 'Study Guide',
          goal: studyGoal,
          pdf_text: pdfText,
          plan: studyPlan || {},
          generated_at: studyPlan?.meta?.generated_at || new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `R22_${(studyPlan?.meta?.subject_name || 'Guide').replace(/ /g, '_')}_${studyGoal}.pdf`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      toast.success('📥 PDF downloaded!');
    } catch {
      toast.error('PDF generation failed. View the plan on screen instead.');
    } finally {
      setIsPdfLoading(false);
    }
  };

  const isProcessingAny = isLoading || syllabusProcessing;

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header />
      <main className="flex-1 container max-w-5xl mx-auto px-4 py-6 pb-28">
        <div className="mb-8 overflow-hidden rounded-[32px] border border-slate-700 bg-slate-900/80 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                <Sparkles className="h-4 w-4 text-yellow-400" />
                JNTUH R22 Workspace
              </div>

              <h1 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-5xl">
                {selectedDept ? `Ready for ${selectedDept.name} exam prep` : 'Build a focused plan before you start studying'}
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                {selectedDept
                  ? (studyPlan?.meta?.index_status === 'live_synthesis'
                    ? `Live pipeline mode is active for ${selectedDept.fullName}. Search, fusion, strategy, and PDF prep stay in one flow.`
                    : studyPlan?.meta?.data_confidence === 'full'
                      ? `A cached high-confidence plan is ready to reuse, with ${studyPlan.meta.papers_analyzed} papers already reflected in the result.`
                      : `Choose a subject, set your goal, and let the workspace generate either a quick pass-focused plan or a deeper high-marks plan.`)
                  : 'Pick your branch, choose a subject, and switch between quick-plan mode or syllabus upload mode whenever you need more context.'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                { label: 'Pipeline', value: selectedDept ? 'Live analysis + PDF' : 'Subject to PDF' },
                { label: 'Modes', value: 'Quick plan / upload syllabus' },
                { label: 'Focus', value: 'Pass fast or score higher' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                  <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {!selectedDept ? (
          /* ── Department Selection Grid ── */
          <div className="space-y-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Select Your Branch</h2>
                <p className="mt-1 text-sm text-slate-400">Start with the branch you want to prepare for and the workspace will load its subjects.</p>
              </div>
              <Badge variant="outline" className="hidden sm:inline-flex border-primary/30 bg-primary/10 text-white">
                Built for Hyderabad students
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {departments.map(dept => (
                <NeumorphicCard
                  key={dept.id}
                  interactive
                  className="cursor-pointer p-4 text-left transition-transform hover:-translate-y-1"
                  onClick={() => setSelectedDept(dept)}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="rounded-2xl bg-primary/10 p-3">
                        <dept.icon className="h-6 w-6 text-primary" />
                      </div>
                      <Badge variant="secondary" className="text-[11px]">{dept.name}</Badge>
                    </div>
                    <div>
                      <p className="font-semibold text-base text-white">{dept.fullName}</p>
                      <p className="mt-2 text-xs leading-5 text-slate-400">{dept.description}</p>
                    </div>
                  </div>
                </NeumorphicCard>
              ))}
            </div>
            <NeumorphicCard variant="inset" className="p-5">
              <p className="text-sm text-slate-400">
                Real R22 syllabus structure is loaded first, then the pipeline layers in search, synthesis, and strategy. If previous-paper coverage is thin for a subject, the app still returns a usable syllabus-first plan instead of failing.
              </p>
            </NeumorphicCard>
          </div>
        ) : (
          /* ── Main Analysis Interface ── */
          <div className="space-y-4">
            {/* Back + Branch badge */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => { setSelectedDept(null); setStudyPlan(null); setSubjects([]); setSyllabusInsight(null); }} className="gap-2 -ml-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1 text-xs border-primary/20 bg-primary/5 text-primary hidden sm:flex">
                  <Sparkles className="h-3 w-3" /> Unified backend
                </Badge>
                <Badge variant="secondary">
                  <selectedDept.icon className="h-3 w-3 mr-1 inline" /> {selectedDept.name}
                </Badge>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {[
                { label: 'Subject source', value: subjects.length ? `${subjects.length} loaded` : 'Loading subject list' },
                { label: 'Current goal', value: studyGoal === 'pass' ? 'Pass mode' : 'High marks mode' },
                { label: 'Current input', value: isSyllabusMode ? 'Syllabus upload' : 'Quick plan builder' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-card/60 p-4 backdrop-blur-xl">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 neumorphic-inset p-1">
                <TabsTrigger value="input" className="gap-2 data-[state=active]:neumorphic-sm rounded-[16px]">
                  <FileText className="h-4 w-4" /> Input
                </TabsTrigger>
                <TabsTrigger value="results" className="gap-2 relative data-[state=active]:neumorphic-sm rounded-[16px]">
                  <ClipboardList className="h-4 w-4" /> Results
                  {studyPlan && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary animate-pulse" />}
                </TabsTrigger>
              </TabsList>

              {/* ─── INPUT TAB ─── */}
              <TabsContent value="input" className="mt-6 space-y-4">
                {isProcessingAny ? (
                  <NeumorphicCard className="py-8 space-y-4">
                    <AnalysisPipeline
                      currentStage={
                        syllabusProcessing ? (pipelineStage || 'vision') :
                          (() => {
                            const active = [...phases]
                              .reverse()
                              .find(p => p.status !== 'waiting');
                            if (!active) return 'vision' as PipelineStage;
                            const map: Record<number, PipelineStage> = { 1: 'vision', 2: 'search', 3: 'fusion', 4: 'brain', 5: 'presentation' };
                            return (map[active.phase as number] || 'vision') as PipelineStage;
                          })()
                      }
                      statusText={syllabusProcessing ? syllabusStage : currentPhaseMsg || 'Initializing pipeline...'}
                    />
                    {!syllabusProcessing && (
                      <div className="space-y-1 px-4">
                        {phases.map(p => (
                          <div key={String(p.phase)} className={`flex items-center gap-2 text-sm transition-all duration-300 ${
                            p.status === 'complete' ? 'text-emerald-400' :
                            p.status === 'processing' ? 'text-blue-400 animate-pulse' :
                            p.status === 'warning' ? 'text-yellow-400' :
                            p.status === 'error' ? 'text-red-400' :
                            'text-slate-400'
                          }`}>
                            {p.status === 'complete' ? '✅' :
                             p.status === 'processing' ? '🔄' :
                             p.status === 'warning' ? '⚠️' :
                             p.status === 'error' ? '❌' : '⏳'}{' '}
                            Phase {p.phase}: {p.msg}
                          </div>
                        ))}
                      </div>
                    )}
                  </NeumorphicCard>
                ) : (
                  <>
                    {/* Subject Dropdown */}
                    <NeumorphicCard className="space-y-3">
                      <label className="text-sm font-medium text-muted-foreground">📖 Select Subject</label>
                      <Select
                        value={selectedSubject?.code || ''}
                        onValueChange={val => {
                          const found = subjects.find(s => s.code === val);
                          setSelectedSubject(found || null);
                        }}
                      >
                        <SelectTrigger className="w-full min-h-[52px] text-base neumorphic-inset border-0">
                          <SelectValue placeholder={subjects.length ? 'Choose a subject...' : `Loading ${selectedDept.name} subjects...`} />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {subjects.map(s => (
                            <SelectItem key={s.code} value={s.code} className="py-3">
                              <div>
                                <p className="font-medium">{s.name}</p>
                                <p className="text-xs text-muted-foreground">{s.code}</p>
                              </div>
                            </SelectItem>
                          ))}
                          {!subjects.length && (
                            <SelectItem value="__none" disabled>No subjects found for {selectedDept.name}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </NeumorphicCard>

                    {/* Study Goal Toggle */}
                    <NeumorphicCard className="space-y-3">
                      <label className="text-sm font-medium text-muted-foreground">🎯 Your Goal</label>
                      <StudyGoalToggle value={studyGoal} onChange={setStudyGoal} disabled={isProcessingAny} />
                    </NeumorphicCard>

                    {/* Panic Mode */}
                    <div className="flex justify-center">
                      <PanicModeButton active={panicMode} onChange={setPanicMode} disabled={isProcessingAny} />
                    </div>

                    <NeumorphicCard className="space-y-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-semibold text-foreground">Run analysis from selected subject</p>
                          <p className="text-xs text-muted-foreground">
                            Uses the built-in R22 syllabus structure and previous-paper pipeline. Upload is not required.
                          </p>
                        </div>
                        <Button
                          onClick={handleAnalyze}
                          disabled={isProcessingAny || !selectedSubject}
                          className="btn-neumorphic-primary min-h-[48px] gap-2"
                        >
                          <BarChart3 className="h-5 w-5" />
                          Run Analysis
                        </Button>
                      </div>
                    </NeumorphicCard>

                    <NeumorphicCard variant="inset" className="p-4">
                      <button
                        onClick={() => setIsSyllabusMode(value => !value)}
                        className="flex w-full items-center justify-between gap-3 rounded-[12px] bg-card px-4 py-3 text-left font-medium text-foreground neumorphic-sm"
                      >
                        <span className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4 text-primary" />
                          Optional syllabus upload
                        </span>
                        {isSyllabusMode ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Upload only when the student wants OCR from their own syllabus image. It is separate from the normal analysis button above.
                      </p>
                    </NeumorphicCard>

                    {isSyllabusMode && (
                      <SyllabusUploader
                        onAnalyze={(imageBase64, uploadedGoal) => {
                          setStudyGoal(uploadedGoal);
                          analyzeSyllabus(imageBase64, uploadedGoal);
                        }}
                        isProcessing={syllabusProcessing}
                        processingStage={syllabusStage}
                      />
                    )}
                  </>
                )}
              </TabsContent>

              {/* ─── RESULTS TAB ─── */}
              <TabsContent value="results" className="mt-6" ref={resultRef}>
                <div className="space-y-4">
                  {syllabusInsight && (
                    <NeumorphicCard className="space-y-3 border border-primary/10 bg-card/80">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-semibold text-foreground">Uploaded syllabus analysis</p>
                          <p className="text-xs text-muted-foreground">
                            {syllabusInsight.matchedSubject
                              ? `Detected subject: ${syllabusInsight.matchedSubject.name} (${syllabusInsight.matchedSubject.code})`
                              : syllabusInsight.detectedSubject
                                ? `Detected text: ${syllabusInsight.detectedSubject}`
                                : 'Subject could not be matched automatically from the uploaded image.'}
                          </p>
                        </div>

                        {!studyPlan && syllabusInsight.matchedSubject && (
                          <Button
                            size="sm"
                            className="btn-neumorphic-primary"
                            onClick={() => startLiveAnalysis(syllabusInsight.matchedSubject!, studyGoal, true)}
                          >
                            Run Full Pipeline
                          </Button>
                        )}
                      </div>

                      <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Extracted Summary
                        </p>
                        <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-foreground">
                          {syllabusInsight.rawText}
                        </pre>
                      </div>
                    </NeumorphicCard>
                  )}

                  {studyPlan ? (
                  <div className="space-y-4">
                    {/* Summary card */}
                    <NeumorphicCard className="bg-blue-500/5 border-2 border-blue-500/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-blue-400">{studyPlan.meta.subject_name}</p>
                          <p className="text-xs text-slate-400">{studyPlan.meta.goal_display}</p>
                        </div>
                        <div className="text-right">
                          {studyPlan.meta.cache_hit && <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/30 mb-1">⚡ Cached</Badge>}
                          <p className="text-xs text-slate-400">
                            {studyPlan.meta.data_confidence === 'none'
                              ? 'Syllabus only'
                              : `${studyPlan.meta.papers_analyzed} papers analyzed`}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: 'Topics', value: studyPlan.summary.total_topics_in_syllabus, color: 'text-emerald-400' },
                          { label: 'Study', value: studyPlan.summary.topics_to_study, color: 'text-blue-400' },
                          { label: 'Marks', value: studyPlan.summary.expected_marks_range[0] != null ? `${studyPlan.summary.expected_marks_range[0]}-${studyPlan.summary.expected_marks_range[1]}` : 'N/A', color: 'text-white' },
                          { label: 'Hours', value: studyPlan.summary.study_time_estimate_hours, color: 'text-purple-400' },
                        ].map(item => (
                          <div key={item.label} className="text-center p-2 neumorphic-sm rounded-xl">
                            <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                            <p className="text-xs text-slate-400">{item.label}</p>
                          </div>
                        ))}
                      </div>
                    </NeumorphicCard>

                    {/* Warnings */}
                    {studyPlan.warnings.length > 0 && (
                      <NeumorphicCard className="border-yellow-600/30 bg-yellow-500/10 space-y-1">
                        {studyPlan.warnings.map((w, i) => (
                          <p key={i} className="text-xs text-yellow-300">{w}</p>
                        ))}
                      </NeumorphicCard>
                    )}

                    {studyPlan.pipeline_report?.length ? (
                      <NeumorphicCard className="space-y-3">
                        <div>
                          <p className="font-semibold text-white">Pipeline Audit</p>
                          <p className="text-xs text-slate-400">See which phases ran live and which ones used fallbacks.</p>
                        </div>
                        <div className="space-y-2">
                          {studyPlan.pipeline_report.map((item) => (
                            <div key={`${item.phase}-${item.name}`} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-700/60 bg-slate-800/60 px-4 py-3">
                              <div>
                                <p className="text-sm font-semibold text-white">
                                  Phase {item.phase}: {item.name}
                                </p>
                                <p className="text-xs text-slate-400">{item.message}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] uppercase border-slate-600 text-slate-300">{item.mode}</Badge>
                                <Badge
                                  variant="secondary"
                                  className={
                                    item.status === 'complete'
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                      : item.status === 'warning'
                                        ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                                  }
                                >
                                  {item.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </NeumorphicCard>
                    ) : null}

                    {/* Result Subtabs */}
                    <Tabs value={activeResultTab} onValueChange={setActiveResultTab}>
                      <TabsList className="grid w-full grid-cols-2 neumorphic-inset p-1">
                        <TabsTrigger value="plan" className="data-[state=active]:neumorphic-sm rounded-[14px] text-sm">
                          <BookOpen className="h-3 w-3 mr-1 inline" /> Study Plan
                        </TabsTrigger>
                        <TabsTrigger value="pyq" className="data-[state=active]:neumorphic-sm rounded-[14px] text-sm">
                          <History className="h-3 w-3 mr-1 inline" /> Prev Questions
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="plan" className="mt-4 space-y-3">
                        {studyPlan.units.map(unit => (
                          <UnitCard key={unit.unit_number} unit={unit} goal={studyPlan.meta.goal} />
                        ))}
                      </TabsContent>

                      <TabsContent value="pyq" className="mt-4">
                        <PreviousQuestionsTab data={studyPlan.previous_year_questions} />
                      </TabsContent>
                    </Tabs>
                  </div>
                ) : isLoading ? (
                  <NeumorphicCard variant="inset" className="py-16 text-center">
                    <BarChart3 className="h-12 w-12 mx-auto text-blue-400 animate-pulse mb-4" />
                    <p className="font-medium text-blue-400">Analyzing 5 years of JNTUH papers...</p>
                    <p className="text-xs text-slate-400 mt-1">Building your personalized frequency index</p>
                  </NeumorphicCard>
                ) : !syllabusInsight ? (
                  <NeumorphicCard variant="inset" className="py-14 text-center">
                    <ClipboardList className="h-12 w-12 mx-auto text-slate-500 mb-4" />
                    <h3 className="font-medium text-white mb-2">No Results Yet</h3>
                    <p className="text-sm text-slate-400 mb-4">Select a subject and tap "Get Study Plan"</p>
                    <Button onClick={() => setActiveTab('input')} className="btn-neumorphic-primary">
                      Go to Input
                    </Button>
                  </NeumorphicCard>
                ) : null}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>

      {/* ── Floating PDF Download Button ── */}
      {studyPlan && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border safe-area-inset-bottom z-50">
          <div className="max-w-2xl mx-auto flex gap-3">
            <Button
              onClick={handleDownloadPdf}
              disabled={isPdfLoading}
              className="flex-1 gap-2 h-12 bg-primary text-primary-foreground font-semibold text-base"
            >
              {isPdfLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <Download className="h-5 w-5" />
              )}
              {isPdfLoading ? 'Generating PDF...' : '📥 Download PDF'}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 neumorphic-sm border-0"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(studyPlan, null, 2));
                setCopied(true);
                toast.success('Copied!');
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
