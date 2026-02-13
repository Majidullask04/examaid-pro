import { cn } from "@/lib/utils";
import { Brain, Search, BarChart3, Sparkles, Loader2 } from "lucide-react";

interface ThinkingAnimationProps {
  stage: string;
  className?: string;
}

const SearchingImage = ({ className }: { className?: string }) => (
  <img
    src="/logo.jpeg"
    alt="Searching"
    className={cn("rounded-full object-cover", className)}
  />
);

const stageConfig: Record<string, { icon: React.ElementType; text: string; color: string }> = {
  "analyzing": { icon: Brain, text: "DeepSeek is reasoning", color: "text-primary" },
  "searching": { icon: SearchingImage, text: "Perplexity is finding papers", color: "text-chart-2" },
  "building": { icon: BarChart3, text: "Building hit ratio analysis", color: "text-chart-3" },
  "generating": { icon: Sparkles, text: "Creating your study plan", color: "text-chart-5" },
  "default": { icon: Loader2, text: "Processing", color: "text-muted-foreground" },
};

export function ThinkingAnimation({ stage, className }: ThinkingAnimationProps) {
  // Determine which config to use based on stage text
  let config = stageConfig.default;

  if (stage.toLowerCase().includes("analyzing") || stage.toLowerCase().includes("stage 1")) {
    config = stageConfig.analyzing;
  } else if (stage.toLowerCase().includes("searching") || stage.toLowerCase().includes("stage 2") || stage.toLowerCase().includes("papers")) {
    config = stageConfig.searching;
  } else if (stage.toLowerCase().includes("building") || stage.toLowerCase().includes("hit ratio") || stage.toLowerCase().includes("stage 3")) {
    config = stageConfig.building;
  } else if (stage.toLowerCase().includes("generating") || stage.toLowerCase().includes("stage 4") || stage.toLowerCase().includes("stage 5") || stage.toLowerCase().includes("study")) {
    config = stageConfig.generating;
  }

  const Icon = config.icon;

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 py-8", className)}>
      <div className={cn("relative", config.color)}>
        <div className="absolute inset-0 rounded-full bg-current opacity-20 animate-ping" />
        <div className="relative p-4 rounded-full bg-card neumorphic-sm">
          <Icon className={cn("h-8 w-8 animate-pulse", config.color)} />
        </div>
      </div>
      <div className="text-center">
        <p className={cn("font-semibold text-lg", config.color)}>
          {config.text}
          <span className="thinking-text" />
        </p>
        <p className="text-sm text-muted-foreground mt-1">{stage}</p>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-2 w-2 rounded-full transition-all duration-300",
              stage.includes(`Stage ${i}`) || stage.includes(`stage ${i}`)
                ? "bg-primary scale-125"
                : "bg-muted"
            )}
          />
        ))}
      </div>
    </div>
  );
}
