import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { UnitCard } from '@/components/ui/unit-card';
import { supabase } from '@/integrations/supabase/client';
import { Subject, Unit } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Layers } from 'lucide-react';

export default function SubjectUnits() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (subjectId) {
      fetchSubjectAndUnits();
    }
  }, [subjectId]);

  const fetchSubjectAndUnits = async () => {
    setIsLoading(true);
    try {
      // Fetch subject
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', subjectId)
        .maybeSingle();

      if (subjectError) throw subjectError;
      setSubject(subjectData);

      // Fetch units
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select('*')
        .eq('subject_id', subjectId)
        .order('unit_number');

      if (unitsError) throw unitsError;
      setUnits(unitsData || []);

      // Fetch question counts
      const counts: Record<string, number> = {};
      for (const unit of unitsData || []) {
        const { count } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('unit_id', unit.id);
        counts[unit.id] = count || 0;
      }
      setQuestionCounts(counts);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-8 md:py-12">
        <div className="container">
          <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
            <Link to="/subjects" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Subjects
            </Link>
          </Button>

          {isLoading ? (
            <>
              <Skeleton className="h-10 w-64 mb-2" />
              <Skeleton className="h-6 w-96 mb-8" />
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-40 rounded-xl" />
                ))}
              </div>
            </>
          ) : subject ? (
            <>
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-4xl">{subject.icon || '📚'}</span>
                  <h1 className="text-3xl md:text-4xl font-bold">{subject.name}</h1>
                </div>
                <p className="text-muted-foreground">
                  {subject.description || 'Explore the units in this subject.'}
                </p>
              </div>

              {units.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {units.map((unit) => (
                    <UnitCard
                      key={unit.id}
                      unit={unit}
                      questionCount={questionCounts[unit.id]}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No units available</h3>
                  <p className="text-muted-foreground">
                    Units for this subject haven't been added yet.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2">Subject not found</h3>
              <p className="text-muted-foreground mb-4">
                The subject you're looking for doesn't exist.
              </p>
              <Button asChild>
                <Link to="/subjects">Browse Subjects</Link>
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
