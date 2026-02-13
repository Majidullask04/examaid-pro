import { useState, useRef, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { AnalysisHistory } from '@/components/AnalysisHistory';
import { LearningResources } from '@/components/LearningResources';
import { SyllabusUploader } from '@/components/SyllabusUploader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NeumorphicCard } from '@/components/neumorphic/NeumorphicCard';
import { StudyGoalToggle } from '@/components/neumorphic/StudyGoalToggle';
import { AnalysisPipeline } from '@/components/neumorphic/AnalysisPipeline';
import { ThinkingAnimation } from '@/components/neumorphic/ThinkingAnimation';
import { WhatsAppShare } from '@/components/neumorphic/WhatsAppShare';
import { PanicModeButton } from '@/components/neumorphic/PanicModeButton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useSyllabusAnalysis, PipelineStage } from '@/hooks/useSyllabusAnalysis';
import {
  Cpu,
  Radio,
  Zap,
  Cog,
  Building2,
  MonitorSmartphone,
  BrainCircuit,
  Database,
  Bot,
  ArrowLeft,
  Sparkles,
  GraduationCap,
  BookOpen,
  Copy,
  Check,
  Video,
  ImageIcon,
  FileText,
  ClipboardList,
  History
} from 'lucide-react';

interface Department {
  id: string;
  name: string;
  fullName: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const departments: Department[] = [
  { id: 'cse', name: 'CSE', fullName: 'Computer Science & Engineering', icon: Cpu, description: 'Core CS fundamentals, programming, algorithms' },
  { id: 'ece', name: 'ECE', fullName: 'Electronics & Communication', icon: Radio, description: 'Electronics, signals, communication systems' },
  { id: 'eee', name: 'EEE', fullName: 'Electrical & Electronics', icon: Zap, description: 'Power systems, electrical machines, controls' },
  { id: 'mech', name: 'MECH', fullName: 'Mechanical Engineering', icon: Cog, description: 'Thermodynamics, mechanics, manufacturing' },
  { id: 'civil', name: 'CIVIL', fullName: 'Civil Engineering', icon: Building2, description: 'Structures, construction, surveying' },
  { id: 'it', name: 'IT', fullName: 'Information Technology', icon: MonitorSmartphone, description: 'Software development, networks, databases' },
  { id: 'csm', name: 'CSM', fullName: 'CS & Machine Learning', icon: BrainCircuit, description: 'AI, machine learning, deep learning' },
  { id: 'csd', name: 'CSD', fullName: 'CS & Data Science', icon: Database, description: 'Big data, analytics, data engineering' },
  { id: 'aids', name: 'AIDS', fullName: 'AI & Data Science', icon: Bot, description: 'Artificial intelligence, data science' },
];

const quickSubjectsMap: Record<string, string[]> = {
  cse: ['Operating Systems', 'DBMS', 'Data Structures', 'Computer Networks', 'Software Engineering', 'Compiler Design'],
  ece: ['Digital Electronics', 'Signals & Systems', 'Communication Systems', 'Microprocessors', 'VLSI Design', 'Antenna Theory'],
  eee: ['Power Systems', 'Electrical Machines', 'Control Systems', 'Power Electronics', 'Transformers', 'Switchgear'],
  mech: ['Thermodynamics', 'Fluid Mechanics', 'Manufacturing Processes', 'Machine Design', 'Heat Transfer', 'IC Engines'],
  civil: ['Structural Analysis', 'Concrete Technology', 'Surveying', 'Geotechnical Engineering', 'Transportation', 'Hydraulics'],
  it: ['Web Technologies', 'Cloud Computing', 'Software Testing', 'Data Mining', 'Information Security', 'Mobile Computing'],
  csm: ['Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'Reinforcement Learning', 'AI Ethics'],
  csd: ['Big Data Analytics', 'Data Warehousing', 'Statistical Methods', 'Data Visualization', 'Predictive Analytics', 'ETL Processes'],
  aids: ['Artificial Intelligence', 'Data Science', 'Python for AI', 'Neural Networks', 'Data Engineering', 'ML Algorithms'],
};

const getQuickSubjects = (deptId: string): string[] => {
  return quickSubjectsMap[deptId] || ['Data Structures', 'Algorithms', 'Programming'];
};

// Generate or retrieve session ID for anonymous history tracking
const getSessionId = (): string => {
  let sessionId = localStorage.getItem('jntuh_session_id');
  if (!sessionId) {
    sessionId = 'session_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('jntuh_session_id', sessionId);
  }
  return sessionId;
};

// Get saved department from localStorage
const getSavedDepartment = (): Department | null => {
  const savedId = localStorage.getItem('jntuh_selected_dept');
  if (savedId) {
    return departments.find(d => d.id === savedId) || null;
  }
  return null;
};

// Extract strategy summary from result
const extractStrategySummary = (text: string): string => {
  // Look for key insights in the result
  const lines = text.split('\n').filter(l => l.trim());
  for (const line of lines) {
    if (line.includes('Focus on') || line.includes('Priority') || line.includes('Strategy')) {
      return line.replace(/[#*]/g, '').trim().slice(0, 150);
    }
  }
  return "Focus on high-probability topics to maximize your exam score!";
};

export default function JNTUH() {
  const { user } = useAuth();
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(getSavedDepartment);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [studyGoal, setStudyGoal] = useState<'pass' | 'high_marks'>('pass');
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState('');
  const [processingStage, setProcessingStage] = useState('');
  const [copied, setCopied] = useState(false);
  const [sessionId] = useState(getSessionId);
  const [showResources, setShowResources] = useState(false);
  const [isSyllabusMode, setIsSyllabusMode] = useState(true);
  const [extractedSubject, setExtractedSubject] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('input');
  const [panicMode, setPanicMode] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // Use the new custom hook
  const { analyzeSyllabus, isProcessing: syllabusProcessing, stage: syllabusStage, pipelineStage } = useSyllabusAnalysis({
    sessionId,
    selectedDepartment,
    panicMode,
    onSuccess: (fullText, subject) => {
      setResult(fullText);
      if (subject) {
        setExtractedSubject(subject);
      }
      setActiveTab('results');
    }
  });

  // Save department selection
  useEffect(() => {
    if (selectedDepartment) {
      localStorage.setItem('jntuh_selected_dept', selectedDepartment.id);
    }
  }, [selectedDepartment]);

  const saveToHistory = async (department: string, subject: string, analysisResult: string) => {
    try {
      const { error } = await supabase
        .from('jntuh_analysis_history')
        .insert({
          session_id: sessionId,
          department,
          subject,
          result: analysisResult,
          user_id: user?.id || null,
        });

      if (error) {
        console.error('Error saving to history:', error);
        const localHistory = JSON.parse(localStorage.getItem('jntuh_history') || '[]');
        localHistory.unshift({
          id: Date.now().toString(),
          department,
          subject,
          result: analysisResult,
          created_at: new Date().toISOString(),
        });
        localStorage.setItem('jntuh_history', JSON.stringify(localHistory.slice(0, 20)));
      }
    } catch (error) {
      console.error('Error saving history:', error);
    }
  };

  const handleLoadHistory = (item: { department: string; subject: string; result: string }) => {
    const dept = departments.find(d => d.name === item.department || d.id === item.department);
    if (dept) {
      setSelectedDepartment(dept);
    }
    setQuery(item.subject);
    setResult(item.result);
    setActiveTab('results');
    toast.success('Previous analysis loaded');
  };

  const handleCopyResult = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleSyllabusAnalysis = (imageBase64: string, goal: 'pass' | 'high_marks') => {
    analyzeSyllabus(imageBase64, goal);
  };

  const handleSearch = async () => {
    if (!selectedDepartment) {
      toast.error('Please select a department');
      return;
    }

    const searchQuery = selectedSubject || query.trim();
    if (!searchQuery) {
      toast.error('Please enter a subject or topic');
      return;
    }

    setIsProcessing(true);
    setResult('');
    setProcessingStage('Stage 1: Researching syllabus & patterns...');

    try {
      const panicModePrompt = panicMode
        ? 'IMPORTANT: This is LAST MINUTE PREP mode. Only give me the TOP 10 most critical questions across ALL units. No fluff, just the essentials.'
        : '';

      const goalPrompt = studyGoal === 'pass'
        ? 'Focus on easy-to-learn topics that appear frequently. Goal: Just pass the exam with minimum effort.'
        : 'Include all important topics for maximum marks. Goal: Score high marks.';

      const enhancedQuery = `JNTUH R22 ${selectedDepartment.fullName} - ${searchQuery}. ${goalPrompt} ${panicModePrompt}. Provide high probability questions with confidence levels for all units.`;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-explain`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          question: enhancedQuery,
          answer: null,
          type: 'deep'
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let fullText = '';
      let stageCount = 0;
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullText += content;
                setResult(fullText);

                if (fullText.length > 100 && stageCount === 0) {
                  setProcessingStage('Stage 2: Deep pattern analysis...');
                  stageCount = 1;
                } else if (fullText.length > 500 && stageCount === 1) {
                  setProcessingStage('Stage 3: Building action plan...');
                  stageCount = 2;
                } else if (fullText.length > 1000 && stageCount === 2) {
                  setProcessingStage('Finalizing recommendations...');
                  stageCount = 3;
                }
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      if (fullText.trim()) {
        await saveToHistory(selectedDepartment.name, searchQuery, fullText);
        setActiveTab('results');
        toast.success('Analysis complete!');
      } else {
        toast.error('🛏️ Our AI is taking a nap. Try again in 10 seconds.');
      }

      setProcessingStage('');
    } catch (error) {
      console.error('Analysis Failed Detailed Error:', error);
      toast.error(error instanceof Error ? error.message : 'Analysis produced no results. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  };

  const handleAnalyzeNow = () => {
    if (isSyllabusMode) {
      // This will be handled by the SyllabusUploader component
      toast.info('Please upload a syllabus image first');
    } else {
      handleSearch();
    }
  };

  const isLoading = isProcessing || syllabusProcessing;
  const currentStage = syllabusStage || processingStage;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container py-6 px-4 max-w-2xl mx-auto">
        {/* Compact Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-1">
            Pass Your JNTUH Exams.
          </h1>
          <p className="text-muted-foreground text-sm">
            AI-powered exam preparation
          </p>
        </div>

        {!selectedDepartment ? (
          // Department Selection - Neumorphic Grid
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Select Your Branch</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Show history dialog
                }}
                className="gap-2"
              >
                <History className="h-4 w-4" />
                History
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {departments.map((dept) => (
                <NeumorphicCard
                  key={dept.id}
                  interactive
                  className="text-center cursor-pointer"
                  onClick={() => setSelectedDepartment(dept)}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-4 rounded-full bg-primary/10">
                      <dept.icon className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{dept.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{dept.fullName}</p>
                    </div>
                  </div>
                </NeumorphicCard>
              ))}
            </div>
          </div>
        ) : (
          // Main Analysis Interface
          <div className="space-y-6">
            {/* Back Button and Department Badge */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedDepartment(null);
                  setQuery('');
                  setResult('');
                  setSelectedSubject('');
                }}
                className="gap-2 -ml-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1 text-xs border-primary/20 bg-primary/5 text-primary hidden sm:flex">
                  <Sparkles className="h-3 w-3" />
                  Gemini 2.0 Flash
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <selectedDepartment.icon className="h-3 w-3" />
                  {selectedDepartment.name}
                </Badge>
                <AnalysisHistory sessionId={sessionId} onLoadHistory={handleLoadHistory} />
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 neumorphic-inset p-1">
                <TabsTrigger value="input" className="gap-2 data-[state=active]:neumorphic-sm rounded-[16px]">
                  <FileText className="h-4 w-4" />
                  Input
                </TabsTrigger>
                <TabsTrigger value="results" className="gap-2 relative data-[state=active]:neumorphic-sm rounded-[16px]">
                  <ClipboardList className="h-4 w-4" />
                  Results
                  {result && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="input" className="mt-6 space-y-6">
                {/* Processing State */}
                {isLoading ? (
                  <NeumorphicCard className="py-8">
                    <AnalysisPipeline
                      currentStage={
                        syllabusProcessing
                          ? (pipelineStage || 'vision')
                          : (processingStage.toLowerCase().includes('search') ? 'search'
                            : processingStage.toLowerCase().includes('paper') ? 'search'
                              : processingStage.toLowerCase().includes('plan') ? 'fusion'
                                : 'brain') as PipelineStage
                      }
                      statusText={syllabusProcessing ? syllabusStage : processingStage}
                    />
                  </NeumorphicCard>
                ) : (
                  <>
                    {/* Subject Selection Dropdown */}
                    <NeumorphicCard className="space-y-4">
                      <label className="text-sm font-medium text-muted-foreground">
                        📖 Select Subject
                      </label>
                      <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                        <SelectTrigger className="w-full min-h-[52px] text-base neumorphic-inset border-0">
                          <SelectValue placeholder="Choose a subject..." />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {getQuickSubjects(selectedDepartment.id).map((subject) => (
                            <SelectItem key={subject} value={subject} className="py-3">
                              {subject}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Or type custom */}
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="bg-card px-2 text-muted-foreground">or type your own</span>
                        </div>
                      </div>

                      <Textarea
                        placeholder="e.g., Operating Systems, DBMS..."
                        value={query}
                        onChange={(e) => {
                          setQuery(e.target.value);
                          setSelectedSubject('');
                        }}
                        className="min-h-[60px] resize-none neumorphic-inset border-0"
                        disabled={isLoading}
                      />
                    </NeumorphicCard>

                    {/* Study Goal Toggle */}
                    <NeumorphicCard className="space-y-3">
                      <label className="text-sm font-medium text-muted-foreground">
                        🎯 Your Goal
                      </label>
                      <StudyGoalToggle
                        value={studyGoal}
                        onChange={setStudyGoal}
                        disabled={isLoading}
                      />
                    </NeumorphicCard>

                    {/* Panic Mode */}
                    <div className="flex justify-center">
                      <PanicModeButton
                        active={panicMode}
                        onChange={setPanicMode}
                        disabled={isLoading}
                      />
                    </div>

                    {/* Mode Toggle */}
                    <NeumorphicCard variant="inset" className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsSyllabusMode(true)}
                          disabled={isLoading}
                          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[12px] font-medium text-sm transition-all min-h-[48px] ${isSyllabusMode
                            ? 'bg-card neumorphic-sm text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                          <ImageIcon className="h-4 w-4" />
                          Upload Syllabus
                        </button>
                        <button
                          onClick={() => setIsSyllabusMode(false)}
                          disabled={isLoading}
                          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[12px] font-medium text-sm transition-all min-h-[48px] ${!isSyllabusMode
                            ? 'bg-card neumorphic-sm text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                          <FileText className="h-4 w-4" />
                          Quick Query
                        </button>
                      </div>
                    </NeumorphicCard>

                    {isSyllabusMode ? (
                      /* Syllabus Upload */
                      <SyllabusUploader
                        onAnalyze={(imageBase64) => handleSyllabusAnalysis(imageBase64, studyGoal)}
                        isProcessing={syllabusProcessing}
                        processingStage={syllabusStage}
                      />
                    ) : (
                      /* Analyze Now Button */
                      <button
                        onClick={handleSearch}
                        disabled={isLoading || (!selectedSubject && !query.trim())}
                        className="w-full btn-neumorphic-primary text-lg py-5 min-h-[64px] disabled:opacity-50 disabled:cursor-not-allowed glow-primary"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <Sparkles className="h-5 w-5" />
                          ✨ Analyze Now
                        </span>
                      </button>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="results" className="mt-6">
                {result ? (
                  <div ref={resultRef} className="space-y-4">
                    {/* Strategy Summary Card */}
                    <NeumorphicCard className="bg-primary/5 border-2 border-primary/20">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-primary/10">
                          <GraduationCap className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-primary">💡 Strategy</p>
                          <p className="text-sm mt-1">{extractStrategySummary(result)}</p>
                        </div>
                      </div>
                    </NeumorphicCard>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowResources(true)}
                        className="flex-1 gap-2 min-h-[48px] neumorphic-sm border-0"
                      >
                        <Video className="h-4 w-4" />
                        Find Resources
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyResult}
                        className="gap-2 min-h-[48px] neumorphic-sm border-0"
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Results Content */}
                    <NeumorphicCard className="overflow-hidden">
                      <MarkdownRenderer content={result} />
                    </NeumorphicCard>
                  </div>
                ) : (
                  <NeumorphicCard variant="inset" className="py-12 text-center">
                    <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-medium text-muted-foreground mb-2">No Results Yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload a syllabus or enter a query to get AI analysis
                    </p>
                    <Button
                      onClick={() => setActiveTab('input')}
                      className="btn-neumorphic-primary"
                    >
                      Go to Input
                    </Button>
                  </NeumorphicCard>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>

      {/* Bottom Navigation (Mobile) - Only show on results tab */}
      {activeTab === 'results' && (
        <div className="fixed bottom-0 left-0 right-0 md:hidden bg-card border-t border-border safe-area-inset-bottom">
          <div className="flex justify-around py-3">
            <button className="flex flex-col items-center gap-1 text-primary min-h-[48px] px-4">
              <GraduationCap className="h-5 w-5" />
              <span className="text-xs font-medium">Home</span>
            </button>
            <button
              onClick={() => { }}
              className="flex flex-col items-center gap-1 text-muted-foreground min-h-[48px] px-4">
              <History className="h-5 w-5" />
              <span className="text-xs">History</span>
            </button>
            <button className="flex flex-col items-center gap-1 text-muted-foreground min-h-[48px] px-4">
              <BookOpen className="h-5 w-5" />
              <span className="text-xs">Profile</span>
            </button>
          </div>
        </div>
      )}

      {/* WhatsApp Share FAB - only show on results */}
      {result && activeTab === 'results' && (
        <WhatsAppShare
          subject={selectedSubject || query || extractedSubject || 'JNTUH Exam Prep'}
          summary={extractStrategySummary(result)}
        />
      )}

      <div className="hidden md:block">
        <Footer />
      </div>

      <LearningResources
        open={showResources}
        onOpenChange={setShowResources}
        topic={query.trim() || extractedSubject || selectedSubject || (selectedDepartment ? `${selectedDepartment.fullName} exam preparation` : 'study topics')}
        context={selectedDepartment?.fullName}
      />
    </div>
  );
}
