import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

import { toast } from 'sonner';
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
  Search,
  ArrowLeft,
  Loader2,
  Sparkles,
  GraduationCap,
  BookOpen
} from 'lucide-react';

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

export default function JNTUH() {
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState('');
  const [processingStage, setProcessingStage] = useState('');

  const handleSearch = async () => {
    if (!query.trim() || !selectedDepartment) {
      toast.error('Please enter a query');
      return;
    }

    setIsProcessing(true);
    setResult('');
    setProcessingStage('Stage 1: Searching latest information...');

    try {
      const enhancedQuery = `JNTUH R22 ${selectedDepartment.fullName} - High probability exam analysis for all units: ${query}. Focus on most frequently asked questions and important topics across all units.`;

      // Use direct fetch for proper streaming support
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
                  setProcessingStage('Stage 2: Analyzing concepts...');
                  stageCount = 1;
                } else if (fullText.length > 500 && stageCount === 1) {
                  setProcessingStage('Stage 3: Building exam strategy...');
                  stageCount = 2;
                } else if (fullText.length > 1000 && stageCount === 2) {
                  setProcessingStage('Final: Generating response...');
                  stageCount = 3;
                }
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
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
            <h2 className="text-xl font-semibold text-center">Select Your B.Tech Department</h2>
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
                Back to Departments
              </Button>
              <Badge variant="secondary" className={`${selectedDepartment.color} border`}>
                <selectedDepartment.icon className="h-4 w-4 mr-1" />
                {selectedDepartment.name} - R22
              </Badge>
            </div>

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
                      <li>Click "Analyze with AI" to start the 4-stage analysis</li>
                      <li>Get high-probability questions for all units</li>
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
                      Analyze with AI (3-Stage + DeepSeek R1)
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

            {/* Results */}
            {result && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI Analysis Result
                  </CardTitle>
                  <CardDescription>
                    Comprehensive analysis with 3-stage processing + DeepSeek R1 reasoning
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {result}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
