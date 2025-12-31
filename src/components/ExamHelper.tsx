import { useState, useEffect, useCallback } from "react";
import { TopNavBar } from "./exam-helper/TopNavBar";
import { AskMode } from "./exam-helper/AskMode";
import { AnswerMode } from "./exam-helper/AnswerMode";

export interface AnalysisResult {
  answer: string;
  confidence: number;
  hitCount: number;
  totalTopics: number;
  avgClassScore: number;
  youtubeLinks?: Array<{ url: string; title: string; channel?: string }>;
  articleLinks?: Array<{ url: string; title: string; source?: string }>;
}

interface ExamHelperProps {
  syllabusKeywords?: string[];
  onSubmit: (query: string) => Promise<AnalysisResult>;
  initialHistory?: string[];
}

export function ExamHelper({ 
  syllabusKeywords = [], 
  onSubmit, 
  initialHistory = [] 
}: ExamHelperProps) {
  const [mode, setMode] = useState<'ask' | 'answer'>('ask');
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<string[]>(initialHistory);

  // Handle question submission
  const handleSubmit = useCallback(async (questionText: string) => {
    if (!questionText.trim()) return;
    
    setIsLoading(true);
    setQuery(questionText);
    
    try {
      const response = await onSubmit(questionText);
      setResult(response);
      setMode('answer');
      
      // Add to history if not already there
      setHistory(prev => {
        const updated = [questionText, ...prev.filter(h => h !== questionText)].slice(0, 6);
        return updated;
      });
    } catch (error) {
      console.error("Error submitting question:", error);
    } finally {
      setIsLoading(false);
    }
  }, [onSubmit]);

  // Handle history item click
  const handleHistorySelect = (item: string) => {
    setQuery(item);
    handleSubmit(item);
  };

  // Handle back to ask mode
  const handleBack = () => {
    if (mode === 'answer') {
      setMode('ask');
      setResult(null);
    }
  };

  // Handle finish review
  const handleFinishReview = () => {
    setMode('ask');
    setResult(null);
    setQuery("");
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mode === 'answer') {
        handleFinishReview();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode]);

  return (
    <div className="w-full min-h-screen overflow-hidden bg-background text-foreground">
      {/* Grid background */}
      <div className="fixed inset-0 grid-bg pointer-events-none" />
      
      {/* Top Navigation Bar */}
      <TopNavBar 
        canGoBack={mode === 'answer'}
        onBack={handleBack}
        history={history}
        onHistorySelect={handleHistorySelect}
      />

      {/* Main Content */}
      <main className="relative pt-14 min-h-screen">
        {mode === 'ask' ? (
          <AskMode 
            syllabusKeywords={syllabusKeywords}
            isLoading={isLoading}
            onSubmit={handleSubmit}
          />
        ) : (
          <AnswerMode 
            query={query}
            result={result}
            onFinishReview={handleFinishReview}
          />
        )}
      </main>
    </div>
  );
}

export default ExamHelper;
