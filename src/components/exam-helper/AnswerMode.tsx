import { useState } from "react";
import { ChevronDown, ChevronUp, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatsBotCard } from "./StatsBotCard";
import { ExternalLinkButton } from "./ExternalLinkButton";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import type { AnalysisResult } from "../ExamHelper";

interface AnswerModeProps {
  query: string;
  result: AnalysisResult | null;
  onFinishReview: () => void;
}

export function AnswerMode({ query, result, onFinishReview }: AnswerModeProps) {
  const [strategyExpanded, setStrategyExpanded] = useState(false);

  if (!result) return null;

  // Parse units and questions from the markdown answer
  const parseQuestions = (markdown: string) => {
    const units: Array<{ name: string; questions: Array<{ text: string; years: string; hitRatio: number }> }> = [];
    
    // Simple parsing - look for unit headers and question patterns
    const lines = markdown.split('\n');
    let currentUnit: { name: string; questions: Array<{ text: string; years: string; hitRatio: number }> } | null = null;
    
    lines.forEach(line => {
      // Match unit headers like "## UNIT 1:" or "### Unit 1 -"
      const unitMatch = line.match(/#{2,3}\s*(?:UNIT\s*)?(\d+)[:\s-]*(.*)/i);
      if (unitMatch) {
        if (currentUnit) units.push(currentUnit);
        currentUnit = { name: `Unit ${unitMatch[1]}: ${unitMatch[2].trim()}`, questions: [] };
        return;
      }
      
      // Match question patterns like "1. Question text (2024, 2023) - 80%"
      const questionMatch = line.match(/^\d+\.\s*\*?\*?(.+?)\*?\*?\s*(?:\(([^)]+)\))?\s*(?:[–-]\s*(\d+)%)?/);
      if (questionMatch && currentUnit) {
        currentUnit.questions.push({
          text: questionMatch[1].replace(/\*\*/g, '').trim(),
          years: questionMatch[2] || '',
          hitRatio: parseInt(questionMatch[3]) || 0
        });
      }
    });
    
    if (currentUnit) units.push(currentUnit);
    return units;
  };

  const units = parseQuestions(result.answer);
  const hasStructuredQuestions = units.length > 0 && units.some(u => u.questions.length > 0);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Layout: Questions (left/main) + Stats Bot (right/bottom on mobile) */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Main Content Area - Full Width Questions */}
          <div className="flex-1 space-y-4 blur-in">
            
            {/* Question Callout */}
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
              <p className="text-sm text-muted-foreground mb-1">Your question</p>
              <p className="text-foreground font-medium">{query}</p>
            </div>

            {/* Collapsible Strategy Header */}
            <button
              onClick={() => setStrategyExpanded(!strategyExpanded)}
              className="w-full strategy-header"
            >
              <div className="flex items-center gap-2">
                <span className="text-primary">📌</span>
                <span className="font-medium text-foreground">Exam Strategy</span>
              </div>
              {strategyExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {strategyExpanded && (
              <div className="bg-card/50 border border-border/30 rounded-xl p-4 text-sm text-muted-foreground blur-in">
                <p>Focus on high-probability questions from Units 1, 2, and 3. These topics appeared most frequently in recent exams.</p>
              </div>
            )}

            {/* Questions - Full Width Cards */}
            {hasStructuredQuestions ? (
              <div className="space-y-6">
                {units.map((unit, unitIndex) => (
                  <div key={unitIndex} className="blur-in" style={{ animationDelay: `${unitIndex * 0.1}s` }}>
                    <h3 className="unit-header">{unit.name}</h3>
                    <div className="space-y-3">
                      {unit.questions.map((q, qIndex) => (
                        <QuestionCard 
                          key={qIndex}
                          index={qIndex + 1}
                          question={q.text}
                          years={q.years}
                          hitRatio={q.hitRatio}
                          youtubeLinks={result.youtubeLinks}
                          articleLinks={result.articleLinks}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Fallback: Render raw markdown */
              <div className="card-dark p-6">
                <MarkdownRenderer content={result.answer} />
                
                {/* Resource buttons if available */}
                {(result.youtubeLinks?.length || result.articleLinks?.length) && (
                  <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-border/30">
                    {result.youtubeLinks?.slice(0, 3).map((video, idx) => (
                      <ExternalLinkButton
                        key={idx}
                        type="youtube"
                        url={video.url}
                        title={video.title || "Watch Video"}
                      />
                    ))}
                    {result.articleLinks?.slice(0, 3).map((article, idx) => (
                      <ExternalLinkButton
                        key={idx}
                        type="article"
                        url={article.url}
                        title={article.title || "Read Article"}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Finish Review Button */}
            <div className="flex justify-center pt-6">
              <Button
                onClick={onFinishReview}
                className="px-8 py-6 text-lg font-semibold rounded-2xl bg-success hover:bg-success/90 text-success-foreground active:scale-95 transition-all"
              >
                <Check className="h-5 w-5 mr-2" />
                Finish Review
              </Button>
            </div>
          </div>

          {/* Stats Bot Card - Sticky on desktop, below on mobile */}
          <div className="lg:w-80 lg:sticky lg:top-20 lg:self-start blur-in blur-in-delay-2">
            <StatsBotCard
              confidence={result.confidence}
              hitCount={result.hitCount}
              totalTopics={result.totalTopics}
              avgClassScore={result.avgClassScore}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Question Card Component
interface QuestionCardProps {
  index: number;
  question: string;
  years: string;
  hitRatio: number;
  youtubeLinks?: Array<{ url: string; title: string; channel?: string }>;
  articleLinks?: Array<{ url: string; title: string; source?: string }>;
}

function QuestionCard({ index, question, years, hitRatio, youtubeLinks, articleLinks }: QuestionCardProps) {
  const getBadgeClass = (ratio: number) => {
    if (ratio >= 70) return 'hit-badge-high';
    if (ratio >= 40) return 'hit-badge-medium';
    return 'hit-badge-low';
  };

  const getHitEmoji = (ratio: number) => {
    if (ratio >= 70) return '🔥';
    if (ratio >= 40) return '⭐';
    return '';
  };

  return (
    <div className="question-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            <span className="text-muted-foreground font-mono text-sm">{index}.</span>
            <div>
              <p className="text-foreground font-medium leading-relaxed">{question}</p>
              {years && (
                <p className="text-sm text-muted-foreground mt-1">
                  Years: {years}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {hitRatio > 0 && (
          <div className={getBadgeClass(hitRatio)}>
            {hitRatio}% {getHitEmoji(hitRatio)}
          </div>
        )}
      </div>

      {/* Resource buttons */}
      <div className="flex flex-wrap gap-2 mt-4">
        {youtubeLinks && youtubeLinks.length > 0 && (
          <ExternalLinkButton
            type="youtube"
            url={youtubeLinks[0].url}
            title="Watch on YouTube"
            compact
          />
        )}
        {articleLinks && articleLinks.length > 0 && (
          <ExternalLinkButton
            type="article"
            url={articleLinks[0].url}
            title="Read Notes"
            compact
          />
        )}
      </div>
    </div>
  );
}
