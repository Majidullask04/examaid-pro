import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PanicModeButtonProps {
  active: boolean;
  onChange: (active: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function PanicModeButton({ active, onChange, disabled, className }: PanicModeButtonProps) {
  return (
    <button
      onClick={() => onChange(!active)}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 px-4 py-3 rounded-[16px] font-medium text-sm transition-all duration-200 min-h-[48px]",
        active
          ? "bg-destructive text-destructive-foreground panic-mode"
          : "neumorphic-sm bg-card text-muted-foreground hover:text-foreground",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <AlertTriangle className={cn("h-4 w-4", active && "animate-pulse")} />
      <span>🚨 Last Minute Prep</span>
    </button>
  );
}
