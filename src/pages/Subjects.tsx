import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SubjectCard } from '@/components/ui/subject-card';
import { supabase } from '@/integrations/supabase/client';
import { Subject } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function Subjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [unitCounts, setUnitCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSubjects();
  }, []);

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

  const filteredSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subject.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-8 md:py-12">
        <div className="container">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="h-8 w-8 text-primary" />
              <h1 className="text-3xl md:text-4xl font-bold">📚 Learning Hub</h1>
            </div>
            <p className="text-muted-foreground">
              Find the best learning resources - videos, articles, and AI-powered explanations for each topic.
            </p>
          </div>

          <div className="relative mb-8 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search subjects..."
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
        </div>
      </main>

      <Footer />
    </div>
  );
}
