import * as React from "react";
import { cn } from "@/lib/utils";

interface NeumorphicCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "inset" | "small";
  interactive?: boolean;
}

const NeumorphicCard = React.forwardRef<HTMLDivElement, NeumorphicCardProps>(
  ({ className, variant = "default", interactive = false, ...props }, ref) => {
    const variantClasses = {
      default: "neumorphic",
      inset: "neumorphic-inset",
      small: "neumorphic-sm",
    };

    return (
      <div
        ref={ref}
        className={cn(
          variantClasses[variant],
          interactive && "cursor-pointer",
          "p-6",
          className
        )}
        {...props}
      />
    );
  }
);
NeumorphicCard.displayName = "NeumorphicCard";

export { NeumorphicCard };
