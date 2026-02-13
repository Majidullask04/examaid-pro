import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ResourceResults } from '@/components/ResourceResults';
import { StudyNotes } from '@/components/StudyNotes';
import { AIBrowser } from '@/components/AIBrowser';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap, Search, Bot, Sparkles, FileText, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface ResourceItem {
  title: string;
  url: string;
  source: string;
  description?: string;
}

interface SearchResults {
  videos: ResourceItem[];
  articles: ResourceItem[];
  learningPath: string;
}

export default function Subjects() {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ai-solver');
  const [userId, setUserId] = useState<string | null>(null);

  // Resource search state
  const [resourceQuery, setResourceQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searchedTopic, setSearchedTopic] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);
    setIsLoading(false);
  };

  const searchResources = async () => {
    if (!resourceQuery.trim()) return;

    setIsSearching(true);
    setSearchResults(null);
    setSearchedTopic(resourceQuery);

    try {
      const { data, error } = await supabase.functions.invoke('find-resources', {
        body: { topic: resourceQuery, context: 'JNTUH exam preparation' }
      });

      if (error) throw error;

      setSearchResults({
        videos: data.videos || [],
        articles: data.articles || [],
        learningPath: data.learningPath || '',
      });
    } catch (error) {
      console.error('Error searching resources:', error);
      toast({
        title: 'Search failed',
        description: 'Unable to find resources. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const saveToNotes = async () => {
    if (!userId || !searchResults) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to save notes.',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingNote(true);
    try {
      const resources = [
        ...searchResults.videos.map(v => ({ ...v, type: 'video' as const })),
        ...searchResults.articles.map(a => ({ ...a, type: 'article' as const })),
      ];

      const { error } = await supabase.from('study_notes').insert({
        user_id: userId,
        title: `Resources: ${searchedTopic}`,
        content: searchResults.learningPath,
        topic: searchedTopic,
        resources,
      });

      if (error) throw error;

      toast({ title: 'Saved to study notes!' });
    } catch (error) {
      console.error('Error saving note:', error);
      toast({
        title: 'Failed to save',
        description: 'Unable to save to notes.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchResources();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background grid-bg selection:bg-primary/20 selection:text-primary">
      <Header />

      <main className="flex-1 py-12">
        <div className="container max-w-5xl mx-auto px-4">
          {/* Hero Section */}
          <div className="mb-12 text-center blur-in">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4 border border-primary/20">
              <GraduationCap className="h-4 w-4" />
              Your Learning Companion
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-4 text-glow">Learning Hub</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              AI-powered exam preparation — get structured answers, find resources, and save your study materials.
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8 blur-in blur-in-delay-1">
            <div className="flex justify-center">
              <TabsList className="bg-secondary/50 backdrop-blur-md border border-white/5 p-1 rounded-full">
                <TabsTrigger value="ai-solver" className="rounded-full px-6 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    <span className="hidden sm:inline">AI Solver</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="search" className="rounded-full px-6 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span className="hidden sm:inline">Quick Search</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="notes" className="rounded-full px-6 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Study Notes</span>
                  </div>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* AI Solver Tab */}
            <TabsContent value="ai-solver" className="fade-enter-active">
              <AIBrowser userId={userId} />
            </TabsContent>

            {/* Quick Search Tab */}
            <TabsContent value="search" className="space-y-8 fade-enter-active">
              {/* Search Bar */}
              <div className="max-w-2xl mx-auto">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-blue-600/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                  <div className="relative flex gap-2 p-2 bg-card/50 backdrop-blur-xl rounded-2xl border border-white/10 shadow-xl">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        placeholder="Search any topic for learning resources..."
                        value={resourceQuery}
                        onChange={(e) => setResourceQuery(e.target.value)}
                        onKeyDown={handleSearchKeyPress}
                        className="pl-12 bg-transparent border-none shadow-none focus-visible:ring-0 h-12 text-lg"
                      />
                    </div>
                    <Button
                      onClick={searchResources}
                      disabled={isSearching || !resourceQuery.trim()}
                      className="h-12 px-6 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                    >
                      {isSearching ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5 mr-2" />
                          Find Resources
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-3 text-center">
                  Powered by AI search — finds YouTube videos and articles for any topic
                </p>
              </div>

              {/* Search Results */}
              {isSearching && (
                <div className="space-y-6">
                  <Skeleton className="h-8 w-64 bg-secondary/50" />
                  <div className="flex gap-6 overflow-hidden">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-48 w-[320px] flex-shrink-0 rounded-2xl bg-secondary/50" />
                    ))}
                  </div>
                  <Skeleton className="h-32 rounded-2xl bg-secondary/50" />
                </div>
              )}

              {searchResults && !isSearching && (
                <ResourceResults
                  topic={searchedTopic}
                  videos={searchResults.videos}
                  articles={searchResults.articles}
                  learningPath={searchResults.learningPath}
                  onSaveToNotes={userId ? saveToNotes : undefined}
                  isSaving={isSavingNote}
                  userId={userId}
                />
              )}

              {!searchResults && !isSearching && (
                <div className="text-center py-16 glass-panel rounded-3xl mx-auto max-w-2xl">
                  <div className="bg-primary/10 p-4 rounded-full inline-flex mb-6">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Search for any topic</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Enter a topic above to find the best YouTube videos and articles for learning.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Study Notes Tab */}
            <TabsContent value="notes" className="fade-enter-active">
              <StudyNotes userId={userId} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}
