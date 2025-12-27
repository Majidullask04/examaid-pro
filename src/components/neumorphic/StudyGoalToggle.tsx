import { cn } from "@/lib/utils";

interface StudyGoalToggleProps {
  value: "pass" | "high_marks";
  onChange: (value: "pass" | "high_marks") => void;
  disabled?: boolean;
}

export function StudyGoalToggle({ value, onChange, disabled }: StudyGoalToggleProps) {
  return (
    <div className="toggle-neumorphic flex gap-1 bg-secondary/50">
      <button
        type="button"
        onClick={() => onChange("pass")}
        disabled={disabled}
        className={cn(
          "flex-1 px-4 py-3 rounded-[16px] font-medium text-sm transition-all duration-200 min-h-[48px]",
          value === "pass"
            ? "bg-success text-success-foreground shadow-md"
            : "bg-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        <span className="flex items-center justify-center gap-2">
          😅 Just Pass
        </span>
      </button>
      <button
        type="button"
        onClick={() => onChange("high_marks")}
        disabled={disabled}
        className={cn(
          "flex-1 px-4 py-3 rounded-[16px] font-medium text-sm transition-all duration-200 min-h-[48px]",
          value === "high_marks"
            ? "bg-primary text-primary-foreground shadow-md"
            : "bg-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        <span className="flex items-center justify-center gap-2">
          🏆 High Marks
        </span>
      </button>
    </div>
  );
}
