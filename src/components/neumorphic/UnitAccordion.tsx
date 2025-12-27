import { useState } from "react";
import { ChevronDown, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickResourceSheet } from "./QuickResourceSheet";

interface GoldenQuestion {
  question: string;
  confidence: string;
  years: string;
}

interface UnitAccordionProps {
  unitNumber: number;
  title: string;
  questions: GoldenQuestion[];
  isExpanded?: boolean;
  onToggle?: () => void;
}

export function UnitAccordion({ unitNumber, title, questions, isExpanded, onToggle }: UnitAccordionProps) {
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [resourceSheetOpen, setResourceSheetOpen] = useState(false);

  const getConfidenceColor = (confidence: string) => {
    const value = parseInt(confidence);
    if (value >= 80) return "text-destructive bg-destructive/10";
    if (value >= 60) return "text-chart-3 bg-chart-3/10";
    if (value >= 40) return "text-primary bg-primary/10";
    return "text-muted-foreground bg-muted";
  };

  const getConfidenceEmoji = (confidence: string) => {
    const value = parseInt(confidence);
    if (value >= 80) return "🔥";
    if (value >= 60) return "⭐⭐⭐";
    if (value >= 40) return "⭐⭐";
    return "⭐";
  };

  const handleLearnClick = (question: string) => {
    setSelectedTopic(question);
    setResourceSheetOpen(true);
  };

  return (
    <>
      <div className="neumorphic-sm overflow-hidden">
        {/* Header */}
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/20 transition-colors min-h-[56px]"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Unit {unitNumber}</p>
              <p className="text-sm text-muted-foreground line-clamp-1">{title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{questions.length} questions</span>
            <ChevronDown className={cn(
              "h-5 w-5 text-muted-foreground transition-transform duration-200",
              isExpanded && "rotate-180"
            )} />
          </div>
        </button>

        {/* Content */}
        <div className={cn(
          "overflow-hidden transition-all duration-300",
          isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        )}>
          <div className="px-4 pb-4 space-y-3">
            {questions.map((q, idx) => (
              <div
                key={idx}
                className="p-4 rounded-[12px] bg-background/50 border border-border/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm leading-relaxed">{q.question}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">{q.years}</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        getConfidenceColor(q.confidence)
                      )}>
                        {q.confidence} {getConfidenceEmoji(q.confidence)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleLearnClick(q.question)}
                    className="shrink-0 px-3 py-2 rounded-[10px] bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors min-h-[44px]"
                  >
                    Learn
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <QuickResourceSheet
        open={resourceSheetOpen}
        onOpenChange={setResourceSheetOpen}
        topic={selectedTopic}
      />
    </>
  );
}
