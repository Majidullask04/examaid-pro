import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { AnalysisHistory } from '@/components/AnalysisHistory';
import { LearningResources } from '@/components/LearningResources';
import { SyllabusUploader } from '@/components/SyllabusUploader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
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
  Loader2,
  Sparkles,
  GraduationCap,
  BookOpen,
  Copy,
  Check,
  Video,
  ImageIcon,
  FileText
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface Department {
  id: string;
  name: string;
  fullName: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
}

const departments: Department[] = [
  { id: 'cse', name: 'CSE', fullName: 'Computer Science & Engineering', icon: Cpu, description: 'Core CS fundamentals, programming, algorithms', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  { id: 'ece', name: 'ECE', fullName: 'Electronics & Communication', icon: Radio, description: 'Electronics, signals, communication systems', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  { id: 'eee', name: 'EEE', fullName: 'Electrical & Electronics', icon: Zap, description: 'Power systems, electrical machines, controls', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  { id: 'mech', name: 'MECH', fullName: 'Mechanical Engineering', icon: Cog, description: 'Thermodynamics, mechanics, manufacturing', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  { id: 'civil', name: 'CIVIL', fullName: 'Civil Engineering', icon: Building2, description: 'Structures, construction, surveying', color: 'bg-stone-500/10 text-stone-500 border-stone-500/20' },
  { id: 'it', name: 'IT', fullName: 'Information Technology', icon: MonitorSmartphone, description: 'Software development, networks, databases', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  { id: 'csm', name: 'CSM', fullName: 'CS & Machine Learning', icon: BrainCircuit, description: 'AI, machine learning, deep learning', color: 'bg-pink-500/10 text-pink-500 border-pink-500/20' },
  { id: 'csd', name: 'CSD', fullName: 'CS & Data Science', icon: Database, description: 'Big data, analytics, data engineering', color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' },
  { id: 'aids', name: 'AIDS', fullName: 'AI & Data Science', icon: Bot, description: 'Artificial intelligence, data science', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
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

export default function JNTUH() {
  const { user } = useAuth();
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState('');
  const [processingStage, setProcessingStage] = useState('');
  const [copied, setCopied] = useState(false);
  const [sessionId] = useState(getSessionId);
  const [showResources, setShowResources] = useState(false);
  const [isSyllabusMode, setIsSyllabusMode] = useState(true);
  const [syllabusProcessing, setSyllabusProcessing] = useState(false);
  const [syllabusStage, setSyllabusStage] = useState('');

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
        // Fallback to localStorage
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

  // Handle syllabus image analysis
  const handleSyllabusAnalysis = async (imageBase64: string, studyGoal: 'pass' | 'high_marks') => {
    if (!selectedDepartment) {
      toast.error('Please select a department first');
      return;
    }

    setSyllabusProcessing(true);
    setResult('');
    setSyllabusStage('Stage 1: Extracting syllabus structure...');

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-syllabus`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'x-session-id': sessionId,
        },
        body: JSON.stringify({
          imageBase64,
          department: selectedDepartment.fullName,
          studyGoal,
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
      let buffer = '';
      let syllabusExtracted = false;

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
              
              if (parsed.stage === 'syllabus_extracted') {
                setSyllabusStage('Stage 2: Searching model papers & analyzing patterns...');
                syllabusExtracted = true;
                // Show extracted syllabus first
                fullText = parsed.content + '\n\n---\n\n## 📊 EXAM PREPARATION ANALYSIS\n\n';
                setResult(fullText);
              } else if (parsed.stage === 'analysis' && parsed.content) {
                fullText += parsed.content;
                setResult(fullText);
                
                if (fullText.length > 2000 && syllabusExtracted) {
                  setSyllabusStage('Stage 3: Building study plan...');
                }
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      // Save to history after completion
      if (fullText.trim()) {
        await saveToHistory(selectedDepartment.name, `Syllabus Analysis (${studyGoal})`, fullText);
      }

      setSyllabusStage('');
      toast.success('Syllabus analysis complete!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to analyze syllabus. Please try again.');
    } finally {
      setSyllabusProcessing(false);
      setSyllabusStage('');
    }
  };

  const handleSearch = async () => {
    if (!query.trim() || !selectedDepartment) {
      toast.error('Please enter a query');
      return;
    }

    setIsProcessing(true);
    setResult('');
    setProcessingStage('Stage 1: Researching syllabus & patterns...');

    try {
      const enhancedQuery = `JNTUH R22 ${selectedDepartment.fullName} - High probability exam analysis for all units: ${query}. Focus on most frequently asked questions and important topics across all units.`;

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

      // Save to history after completion
      if (fullText.trim()) {
        await saveToHistory(selectedDepartment.name, query, fullText);
      }

      setProcessingStage('');
      toast.success('Analysis complete!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to process query. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container py-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <GraduationCap className="h-4 w-4" />
            JNTUH R22 Regulation
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            JNTUH Exam Preparation
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            AI-powered analysis for high-probability questions across all units. 
            Select your department and get comprehensive exam insights.
          </p>
        </div>

        {!selectedDepartment ? (
          // Department Selection Grid
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Select Your B.Tech Department</h2>
              <AnalysisHistory sessionId={sessionId} onLoadHistory={handleLoadHistory} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map((dept) => (
                <Card 
                  key={dept.id}
                  className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-2 hover:border-primary/50"
                  onClick={() => setSelectedDepartment(dept)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl ${dept.color}`}>
                        <dept.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{dept.name}</CardTitle>
                        <CardDescription className="text-xs">{dept.fullName}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{dept.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          // Search Interface
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Back Button and Department Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSelectedDepartment(null);
                    setQuery('');
                    setResult('');
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Badge variant="secondary" className={`${selectedDepartment.color} border`}>
                  <selectedDepartment.icon className="h-4 w-4 mr-1" />
                  {selectedDepartment.name} - R22
                </Badge>
              </div>
              <AnalysisHistory sessionId={sessionId} onLoadHistory={handleLoadHistory} />
            </div>

            {/* Mode Toggle */}
            <Card className="bg-muted/30">
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-sm mb-1">Analysis Mode</h3>
                    <p className="text-xs text-muted-foreground">
                      Choose how you want to analyze your syllabus
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={isSyllabusMode ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setIsSyllabusMode(true)}
                      disabled={isProcessing || syllabusProcessing}
                      className="gap-2"
                    >
                      <ImageIcon className="h-4 w-4" />
                      Upload Syllabus
                    </Button>
                    <Button
                      variant={!isSyllabusMode ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setIsSyllabusMode(false)}
                      disabled={isProcessing || syllabusProcessing}
                      className="gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Type Query
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {isSyllabusMode ? (
              /* Syllabus Upload Mode */
              <div className="space-y-6">
                <Card className="bg-muted/50 border-dashed">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <ImageIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-medium text-sm">How it works</h3>
                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                          <li>Upload or take a photo of your JNTUH syllabus</li>
                          <li>Choose your goal: "Just Pass" or "High Marks"</li>
                          <li>AI analyzes and creates a personalized study plan</li>
                        </ol>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <SyllabusUploader 
                  onAnalyze={handleSyllabusAnalysis}
                  isProcessing={syllabusProcessing}
                  processingStage={syllabusStage}
                />
              </div>
            ) : (
              /* Text Query Mode */
              <div className="space-y-6">
                {/* Usage Guide */}
                <Card className="bg-muted/50 border-dashed">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-medium text-sm">How to use</h3>
                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                          <li>Click a quick subject button below OR type your subject/topic</li>
                          <li>Click "Analyze with AI" to start the 3-stage analysis</li>
                          <li>Get hit ratios, confidence levels, and study action plans</li>
                        </ol>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Subject Buttons */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Quick Select Common Subjects:</h3>
                  <div className="flex flex-wrap gap-2">
                    {getQuickSubjects(selectedDepartment.id).map((subject) => (
                      <Button
                        key={subject}
                        variant="outline"
                        size="sm"
                        onClick={() => setQuery(subject + ' high probability questions for all units')}
                        disabled={isProcessing}
                        className="text-xs"
                      >
                        {subject}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Search Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      {selectedDepartment.fullName}
                    </CardTitle>
                    <CardDescription>
                      Enter your subject or topic to analyze high-probability questions across all units
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      placeholder="e.g., 'Operating Systems complete analysis' or 'DBMS important questions for all units' or 'Data Structures high probability topics'"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="min-h-[100px] resize-none"
                      disabled={isProcessing}
                    />
                    <Button 
                      onClick={handleSearch} 
                      disabled={isProcessing || !query.trim()}
                      className="w-full gap-2"
                      size="lg"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {processingStage || 'Processing...'}
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Analyze with AI (3-Stage Analysis)
                        </>
                      )}
                    </Button>

                    {/* Processing Stages Indicator */}
                    {isProcessing && (
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <div className="flex gap-1">
                          <div className={`h-2 w-2 rounded-full ${processingStage.includes('1') ? 'bg-primary animate-pulse' : 'bg-muted'}`} />
                          <div className={`h-2 w-2 rounded-full ${processingStage.includes('2') ? 'bg-primary animate-pulse' : 'bg-muted'}`} />
                          <div className={`h-2 w-2 rounded-full ${processingStage.includes('3') ? 'bg-primary animate-pulse' : 'bg-muted'}`} />
                          <div className={`h-2 w-2 rounded-full ${processingStage.includes('Final') ? 'bg-primary animate-pulse' : 'bg-muted'}`} />
                        </div>
                        <span>{processingStage}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}


            {/* Results */}
            {result && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        AI Analysis Result
                      </CardTitle>
                      <CardDescription>
                        Comprehensive analysis with hit ratios, confidence levels & action plans
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowResources(true)}
                        className="gap-2"
                      >
                        <Video className="h-4 w-4" />
                        Find Resources
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyResult}
                        className="gap-2"
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
                  </div>
                </CardHeader>
                <CardContent>
                  <MarkdownRenderer content={result} />
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      <Footer />
      
      <LearningResources
        open={showResources}
        onOpenChange={setShowResources}
        topic={query}
        context={selectedDepartment?.fullName}
      />
    </div>
  );
}
