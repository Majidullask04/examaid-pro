import { Bot, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface StatsBotCardProps {
  confidence: number;
  hitCount: number;
  totalTopics: number;
  avgClassScore: number;
}

export function StatsBotCard({ confidence, hitCount, totalTopics, avgClassScore }: StatsBotCardProps) {
  const isLowConfidence = confidence < 60;

  return (
    <div className={`stats-card ${isLowConfidence ? 'stats-card-warning' : ''}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <span className="font-semibold text-foreground">ExamHelper Bot</span>
      </div>

      {/* Stats */}
      <div className="space-y-4">
        {/* Confidence */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Confidence</span>
            <span className={`text-sm font-semibold ${
              isLowConfidence ? 'text-warning' : 'text-success'
            }`}>
              {confidence}%
            </span>
          </div>
          <Progress 
            value={confidence} 
            className={`h-2 ${isLowConfidence ? '[&>div]:bg-warning' : '[&>div]:bg-success'}`}
          />
        </div>

        {/* Syllabus Hit */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Syllabus Hit</span>
          <span className="text-sm font-medium text-foreground">
            {hitCount} / {totalTopics} topics
          </span>
        </div>

        {/* Last Asked */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Last asked</span>
          <span className="text-sm font-medium text-foreground">Just now</span>
        </div>

        {/* Average Score */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Similar students got</span>
          <span className="text-sm font-medium text-foreground">{avgClassScore}% avg</span>
        </div>
      </div>

      {/* Low confidence warning */}
      {isLowConfidence && (
        <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
          <span className="text-xs text-warning">Verify with faculty or textbook</span>
        </div>
      )}
    </div>
  );
}
