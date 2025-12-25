import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Question } from '@/types/database';
import { Lightbulb, Brain, ChevronDown, ChevronUp, Loader2, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LearningResources } from '@/components/LearningResources';

interface QuestionCardProps {
  question: Question;
  onExplain: (question: Question, type: 'explain' | 'deep') => void;
  isExplaining?: boolean;
  explanation?: string;
}

const importanceBadgeVariants = {
  high: 'bg-destructive/10 text-destructive border-destructive/20',
  medium: 'bg-primary/10 text-primary border-primary/20',
  low: 'bg-muted text-muted-foreground border-border',
};

export function QuestionCard({ question, onExplain, isExplaining, explanation }: QuestionCardProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showResources, setShowResources] = useState(false);

  return (
    <>
      <Card className="transition-all duration-300 hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-base font-medium leading-relaxed">
              {question.question}
            </CardTitle>
            <Badge 
              variant="outline" 
              className={cn("shrink-0 capitalize", importanceBadgeVariants[question.importance])}
            >
              {question.importance}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {question.answer && (
            <div>
              <button
                onClick={() => setShowAnswer(!showAnswer)}
                className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {showAnswer ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showAnswer ? 'Hide Answer' : 'Show Answer'}
              </button>
              {showAnswer && (
                <div className="mt-2 p-3 bg-muted/50 rounded-lg text-sm">
                  {question.answer}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExplain(question, 'explain')}
              disabled={isExplaining}
              className="gap-2"
            >
              {isExplaining ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lightbulb className="h-4 w-4" />
              )}
              Simple Explanation
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExplain(question, 'deep')}
              disabled={isExplaining}
              className="gap-2"
            >
              {isExplaining ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Brain className="h-4 w-4" />
              )}
              Deep Understanding
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowResources(true)}
              className="gap-2"
            >
              <Video className="h-4 w-4" />
              Find Resources
            </Button>
          </div>

          {explanation && (
            <div>
              <button
                onClick={() => setShowExplanation(!showExplanation)}
                className="flex items-center gap-2 text-sm font-medium text-secondary hover:text-secondary/80 transition-colors"
              >
                {showExplanation ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showExplanation ? 'Hide AI Explanation' : 'View AI Explanation'}
              </button>
              {showExplanation && (
                <div className="mt-2 p-4 bg-secondary/5 border border-secondary/20 rounded-lg text-sm prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap">{explanation}</div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <LearningResources
        open={showResources}
        onOpenChange={setShowResources}
        topic={question.question}
        context={question.answer || undefined}
      />
    </>
  );
}
