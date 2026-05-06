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
  high: 'bg-red-500/20 text-red-400 border-red-500/30 px-3 py-1 text-sm font-semibold',
  medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30 px-3 py-1 text-sm font-semibold',
  low: 'bg-slate-700 text-slate-300 border-slate-600 px-3 py-1 text-sm font-semibold',
};

export function QuestionCard({ question, onExplain, isExplaining, explanation }: QuestionCardProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showResources, setShowResources] = useState(false);

  return (
    <>
      <Card className="transition-all duration-300 hover:shadow-xl border-2 border-slate-700 bg-slate-900">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-xl md:text-2xl font-bold leading-relaxed text-white">
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
        <CardContent className="space-y-6">
          {question.answer && (
            <div className="bg-slate-800 rounded-xl p-4 border-2 border-slate-600">
              <button
                onClick={() => setShowAnswer(!showAnswer)}
                className="flex items-center gap-2 text-base font-semibold text-white hover:text-slate-200 transition-colors w-full text-left"
              >
                {showAnswer ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                {showAnswer ? 'Hide Answer' : 'Show Answer'}
              </button>
              {showAnswer && (
                <div className="mt-3 p-4 bg-slate-700 rounded-lg text-base text-white leading-relaxed border border-slate-600">
                  {question.answer}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="default"
              onClick={() => onExplain(question, 'explain')}
              disabled={isExplaining}
              className="gap-2 flex-1 min-w-[180px] h-11 bg-slate-800 text-white border-2 border-slate-600 hover:bg-slate-700"
            >
              {isExplaining ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <Lightbulb className="h-5 w-5 text-white" />
              )}
              Simple Explanation
            </Button>
            <Button
              variant="outline"
              size="default"
              onClick={() => onExplain(question, 'deep')}
              disabled={isExplaining}
              className="gap-2 flex-1 min-w-[180px] h-11 bg-slate-800 text-white border-2 border-slate-600 hover:bg-slate-700"
            >
              {isExplaining ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <Brain className="h-5 w-5 text-white" />
              )}
              Deep Understanding
            </Button>
            <Button
              variant="secondary"
              size="default"
              onClick={() => setShowResources(true)}
              className="gap-2 flex-1 min-w-[180px] h-11 bg-slate-800 text-white border-2 border-slate-600 hover:bg-slate-700"
            >
              <Video className="h-5 w-5 text-white" />
              Find Resources
            </Button>
          </div>

          {explanation && (
            <div className="bg-slate-800 rounded-xl p-4 border-2 border-slate-600">
              <button
                onClick={() => setShowExplanation(!showExplanation)}
                className="flex items-center gap-2 text-base font-semibold text-white hover:text-slate-200 transition-colors w-full text-left"
              >
                {showExplanation ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                {showExplanation ? 'Hide AI Explanation' : 'View AI Explanation'}
              </button>
              {showExplanation && (
                <div className="mt-3 p-4 bg-slate-700 rounded-lg text-base text-white leading-relaxed prose prose-sm max-w-none border border-slate-600">
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
