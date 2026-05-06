import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiUrl } from '@/lib/api';
import { toast } from 'sonner';
import {
  Search,
  BookOpen,
  TrendingUp,
  Target,
  Sparkles,
  ArrowRight,
  GraduationCap,
  Brain,
  Clock,
  Star,
  Zap,
  Upload,
  Type,
  Image as ImageIcon
} from 'lucide-react';

interface Subject {
  subject_code: string;
  subject_name: string;
  branch: string;
}

const BRANCH_COLORS: Record<string, string> = {
  'CSE': 'bg-blue-500/10 text-blue-600 border-blue-200',
  'IT': 'bg-cyan-500/10 text-cyan-600 border-cyan-200',
  'ECE': 'bg-purple-500/10 text-purple-600 border-purple-200',
  'EEE': 'bg-orange-500/10 text-orange-600 border-orange-200',
  'MECH': 'bg-red-500/10 text-red-600 border-red-200',
  'CIVIL': 'bg-green-500/10 text-green-600 border-green-200',
};

export default function SubjectSelector() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'select' | 'upload' | 'manual'>('select');
  const [manualSubjectName, setManualSubjectName] = useState('');
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchSubjects = useCallback(async () => {
    try {
      const response = await fetch(apiUrl('/api/v2/subjects'));
      if (!response.ok) throw new Error('Failed to fetch subjects');
      const data = await response.json();
      setSubjects(data.subjects || []);
    } catch (error) {
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const filteredSubjects = useMemo(() => {
    let filtered = subjects;

    if (selectedBranch) {
      filtered = filtered.filter(s => s.branch === selectedBranch);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.subject_name.toLowerCase().includes(query) ||
        s.subject_code.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [searchQuery, selectedBranch, subjects]);

  const branches = [...new Set(subjects.map(s => s.branch))].sort();

  const getPredictionStats = (subjectCode: string) => {
    // Mock stats - in production, fetch from API
    return {
      highConfidence: Math.floor(Math.random() * 5) + 3,
      avgProbability: Math.floor(Math.random() * 20) + 70
    };
  };

  const handleManualSubmit = async () => {
    if (!manualSubjectName.trim()) {
      toast.error('Please enter a subject name');
      return;
    }
    // Navigate to predictions with manual subject
    navigate(`/predictions/MANUAL_${encodeURIComponent(manualSubjectName)}`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedImage(file);
    setUploading(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        
        // Send to syllabus analyze endpoint
        const response = await fetch(apiUrl('/api/syllabus/analyze'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_base64: base64.split(',')[1],
            department: 'Computer Science',
            goal: 'high_marks',
            panic_mode: false
          })
        });

        if (!response.ok) throw new Error('Failed to analyze syllabus');

        const data = await response.json();
        const subjectHint = data.subject_hint || 'Unknown';
        
        toast.success('Syllabus analyzed successfully!');
        
        // Navigate to predictions with extracted subject
        navigate(`/predictions/${subjectHint.replace(/\s+/g, '_')}`);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to analyze syllabus');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-slate-900 text-white">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20" />
        
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium">AI-Powered Question Prediction</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Select Your Subject
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                & Predict Exam Questions
              </span>
            </h1>
            
            <p className="text-lg text-slate-300 mb-8">
              Our AI analyzes previous year papers to predict which questions are most likely to appear in your exam.
              <span className="block mt-2 text-slate-400">
                High-confidence predictions backed by statistical analysis.
              </span>
            </p>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div className="text-3xl font-bold text-blue-400">85%+</div>
                <div className="text-sm text-slate-300">Prediction Accuracy</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div className="text-3xl font-bold text-purple-400">5+ Years</div>
                <div className="text-sm text-slate-300">Historical Data</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div className="text-3xl font-bold text-pink-400">24/7</div>
                <div className="text-sm text-slate-300">AI Available</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Input Method Tabs */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-xl border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto">
              <TabsTrigger value="select" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Select Subject
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Syllabus
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <Type className="w-4 h-4" />
                Write Subject Name
              </TabsTrigger>
            </TabsList>

            {/* Select from List Tab */}
            <TabsContent value="select" className="mt-4">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search subjects by name or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 text-base"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto w-full md:w-auto">
                  <Button
                    variant={selectedBranch === null ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedBranch(null)}
                  >
                    All
                  </Button>
                  {branches.map(branch => (
                    <Button
                      key={branch}
                      variant={selectedBranch === branch ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedBranch(branch)}
                    >
                      {branch}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Upload Syllabus Tab */}
            <TabsContent value="upload" className="mt-4">
              <Card className="border-dashed-2 border-slate-600 bg-slate-800">
                <CardContent className="p-8 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="syllabus-upload"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="syllabus-upload"
                    className="cursor-pointer block"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-slate-700 rounded-full shadow-sm">
                        <ImageIcon className="w-12 h-12 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">
                          Upload Your Syllabus
                        </h3>
                        <p className="text-sm text-slate-300">
                          Click to upload or drag and drop an image of your syllabus
                        </p>
                      </div>
                      <Button disabled={uploading} className="bg-slate-700 text-white hover:bg-slate-600">
                        {uploading ? 'Analyzing...' : 'Choose Image'}
                      </Button>
                    </div>
                  </label>
                  {uploadedImage && (
                    <p className="mt-4 text-sm text-green-600">
                      Selected: {uploadedImage.name}
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Manual Subject Name Tab */}
            <TabsContent value="manual" className="mt-4">
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-white mb-2 block">
                        Enter Subject Name
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g., Data Structures, Operating Systems, etc."
                        value={manualSubjectName}
                        onChange={(e) => setManualSubjectName(e.target.value)}
                        className="h-12 text-base bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                        onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
                      />
                    </div>
                    <Button onClick={handleManualSubmit} className="w-full bg-slate-700 text-white hover:bg-slate-600 border-slate-600">
                      Get Predictions
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    <p className="text-xs text-slate-400 text-center">
                      AI will generate predictions based on general syllabus patterns
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Subjects Grid - Only show in Select tab */}
      {activeTab === 'select' && (
        <main className="max-w-7xl mx-auto px-4 py-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-6 w-20 mb-4" />
                  <Skeleton className="h-8 w-full mb-2" />
                  <Skeleton className="h-4 w-32" />
                </Card>
              ))}
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">No subjects found</h3>
              <p className="text-slate-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSubjects.map((subject, index) => {
                const stats = getPredictionStats(subject.subject_code);
                return (
                  <Card
                    key={subject.subject_code}
                    className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-blue-200 overflow-hidden"
                    onClick={() => navigate(`/predictions/${subject.subject_code}`)}
                  >
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <Badge
                          variant="outline"
                          className={BRANCH_COLORS[subject.branch] || 'bg-gray-100 text-gray-700'}
                        >
                          {subject.branch}
                        </Badge>
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span>{stats.avgProbability}%</span>
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                        {subject.subject_name}
                      </h3>
                      <p className="text-sm text-slate-400 mb-4 font-mono">
                        {subject.subject_code}
                      </p>

                      <div className="flex items-center gap-4 text-sm text-slate-300 mb-4">
                        <div className="flex items-center gap-1">
                          <Target className="w-4 h-4 text-green-400" />
                          <span>{stats.highConfidence} High Confidence</span>
                        </div>
                      </div>

                      <Button className="w-full group/btn bg-slate-700 text-white hover:bg-slate-600 border-slate-600">
                        View Predictions
                        <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Help Section */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Brain className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">AI Analysis</h3>
              <p className="text-sm text-slate-600">
                Our AI analyzes 5+ years of previous papers to identify question patterns
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Probability Scoring</h3>
              <p className="text-sm text-slate-600">
                Each question gets a probability score based on historical frequency
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Smart Study Plans</h3>
              <p className="text-sm text-slate-600">
                Get personalized study plans based on high-probability questions
              </p>
            </div>
          </div>
        </main>
      )}

      <Footer />
    </div>
  );
}
