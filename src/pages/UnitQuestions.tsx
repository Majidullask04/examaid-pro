import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { QuestionCard } from '@/components/ui/question-card';
import { supabase } from '@/integrations/supabase/client';
import { Unit, Question, Subject } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Sparkles, Loader2 } from 'lucide-react';
import { streamAIExplanation } from '@/services/aiService';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function UnitQuestions() {
  const { unitId } = useParams<{ unitId: string }>();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [explainingId, setExplainingId] = useState<string | null>(null);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (unitId) {
      fetchUnitAndQuestions();
    }
  }, [unitId, fetchUnitAndQuestions]);

  const fetchUnitAndQuestions = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch unit
      const { data: unitData, error: unitError } = await supabase
        .from('units')
        .select('*')
        .eq('id', unitId)
        .maybeSingle();

      if (unitError) throw unitError;
      setUnit(unitData);

      // Fetch subject
      if (unitData) {
        const { data: subjectData } = await supabase
          .from('subjects')
          .select('*')
          .eq('id', unitData.subject_id)
          .maybeSingle();
        setSubject(subjectData);
      }

      // Fetch questions ordered by importance
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('unit_id', unitId)
        .order('importance');

      if (questionsError) throw questionsError;

      // Sort by importance: high, medium, low
      const sortedQuestions = (questionsData || []).sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.importance] - order[b.importance];
      });

      setQuestions(sortedQuestions);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [unitId]);

  const handleExplain = useCallback(async (question: Question, type: 'explain' | 'deep') => {
    setExplainingId(question.id);
    setExplanations((prev) => ({ ...prev, [question.id]: '' }));

    await streamAIExplanation(
      question.question,
      question.answer,
      type,
      {
        onDelta: (text) => {
          setExplanations((prev) => ({
            ...prev,
            [question.id]: (prev[question.id] || '') + text,
          }));
        },
        onDone: () => {
          setExplainingId(null);
        },
        onError: (error) => {
          setExplainingId(null);
          toast({
            title: 'Error',
            description: error,
            variant: 'destructive',
          });
        },
      }
    );
  }, [toast]);

  const generateSummary = useCallback(async () => {
    if (questions.length === 0) return;

    setIsGeneratingSummary(true);
    setSummary('');
    setSummaryDialogOpen(true);

    const questionsText = questions
      .map((q, i) => `${i + 1}. ${q.question}${q.answer ? ` (Answer: ${q.answer})` : ''}`)
      .join('\n');

    await streamAIExplanation(
      questionsText,
      null,
      'summary',
      {
        onDelta: (text) => {
          setSummary((prev) => prev + text);
        },
        onDone: () => {
          setIsGeneratingSummary(false);
        },
        onError: (error) => {
          setIsGeneratingSummary(false);
          toast({
            title: 'Error',
            description: error,
            variant: 'destructive',
          });
        },
      }
    );
  }, [questions, toast]);

  const highPriorityCount = questions.filter((q) => q.importance === 'high').length;
  const mediumPriorityCount = questions.filter((q) => q.importance === 'medium').length;
  const lowPriorityCount = questions.filter((q) => q.importance === 'low').length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-8 md:py-12">
        <div className="container">
          {subject && (
            <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
              <Link to={`/subjects/${subject.id}`} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to {subject.name}
              </Link>
            </Button>
          )}

          {isLoading ? (
            <>
              <Skeleton className="h-10 w-64 mb-2" />
              <Skeleton className="h-6 w-96 mb-8" />
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-xl" />
                ))}
              </div>
            </>
          ) : unit ? (
            <>
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-lg">
                    {unit.unit_number}
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold">{unit.title}</h1>
                </div>
                <p className="text-muted-foreground mb-4">
                  {unit.description || 'Study the questions in this unit.'}
                </p>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {questions.length} Questions
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {highPriorityCount > 0 && (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                        {highPriorityCount} High
                      </Badge>
                    )}
                    {mediumPriorityCount > 0 && (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        {mediumPriorityCount} Medium
                      </Badge>
                    )}
                    {lowPriorityCount > 0 && (
                      <Badge variant="outline">
                        {lowPriorityCount} Low
                      </Badge>
                    )}
                  </div>

                  {questions.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateSummary}
                      disabled={isGeneratingSummary}
                      className="gap-2"
                    >
                      {isGeneratingSummary ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Generate Revision Summary
                    </Button>
                  )}
                </div>
              </div>

              {questions.length > 0 ? (
                <div className="space-y-4">
                  {questions.map((question) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      onExplain={handleExplain}
                      isExplaining={explainingId === question.id}
                      explanation={explanations[question.id]}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No questions available</h3>
                  <p className="text-muted-foreground">
                    Questions for this unit haven't been added yet.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2">Unit not found</h3>
              <p className="text-muted-foreground mb-4">
                The unit you're looking for doesn't exist.
              </p>
              <Button asChild>
                <Link to="/subjects">Browse Subjects</Link>
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />

      <Dialog open={summaryDialogOpen} onOpenChange={setSummaryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Revision Summary
            </DialogTitle>
            <DialogDescription>
              AI-generated summary for {unit?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm max-w-none">
            {summary ? (
              <div className="whitespace-pre-wrap">{summary}</div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
