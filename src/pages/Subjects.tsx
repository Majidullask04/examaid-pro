import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SubjectCard } from '@/components/ui/subject-card';
import { ResourceResults } from '@/components/ResourceResults';
import { StudyNotes } from '@/components/StudyNotes';
import { supabase } from '@/integrations/supabase/client';
import { Subject } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap, Search, BookOpen, Sparkles, FileText, Loader2 } from 'lucide-react';
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
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [unitCounts, setUnitCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('browse');
  const [userId, setUserId] = useState<string | null>(null);
  
  // Resource search state
  const [resourceQuery, setResourceQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searchedTopic, setSearchedTopic] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchSubjects();
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);
  };

  const fetchSubjects = async () => {
    setIsLoading(true);
    try {
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      if (subjectsError) throw subjectsError;

      setSubjects(subjectsData || []);

      // Fetch unit counts for each subject
      const counts: Record<string, number> = {};
      for (const subject of subjectsData || []) {
        const { count } = await supabase
          .from('units')
          .select('*', { count: 'exact', head: true })
          .eq('subject_id', subject.id);
        counts[subject.id] = count || 0;
      }
      setUnitCounts(counts);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setIsLoading(false);
    }
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

  const filteredSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subject.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-8 md:py-12">
        <div className="container">
          {/* Hero Section */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
              <GraduationCap className="h-4 w-4" />
              Your Learning Companion
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Learning Hub</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Find the best learning resources — videos, articles, and AI-powered explanations for your exam preparation.
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
              <TabsTrigger value="browse" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Browse</span>
              </TabsTrigger>
              <TabsTrigger value="search" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Quick Search</span>
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Study Notes</span>
              </TabsTrigger>
            </TabsList>

            {/* Browse Subjects Tab */}
            <TabsContent value="browse" className="space-y-6">
              <div className="relative max-w-md mx-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter subjects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {isLoading ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-48 rounded-xl" />
                  ))}
                </div>
              ) : filteredSubjects.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredSubjects.map((subject) => (
                    <SubjectCard
                      key={subject.id}
                      subject={subject}
                      unitCount={unitCounts[subject.id]}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No subjects found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery ? 'Try a different search term.' : 'No subjects have been added yet.'}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Quick Search Tab */}
            <TabsContent value="search" className="space-y-6">
              {/* Search Bar */}
              <div className="max-w-2xl mx-auto">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search any topic for learning resources..."
                      value={resourceQuery}
                      onChange={(e) => setResourceQuery(e.target.value)}
                      onKeyDown={handleSearchKeyPress}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={searchResources} disabled={isSearching || !resourceQuery.trim()}>
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Find Resources
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Powered by AI search — finds YouTube videos and articles for any topic
                </p>
              </div>

              {/* Search Results */}
              {isSearching && (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-64" />
                  <div className="flex gap-4 overflow-hidden">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-32 w-[280px] flex-shrink-0 rounded-xl" />
                    ))}
                  </div>
                  <Skeleton className="h-24 rounded-xl" />
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
                />
              )}

              {!searchResults && !isSearching && (
                <div className="text-center py-12">
                  <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Search for any topic</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Enter a topic above to find the best YouTube videos and articles for learning.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Study Notes Tab */}
            <TabsContent value="notes">
              <StudyNotes userId={userId} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}
