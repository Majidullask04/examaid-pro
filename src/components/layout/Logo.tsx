
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
    className?: string;
    iconClassName?: string;
    textClassName?: string;
    showText?: boolean;
}

export function Logo({
    className,
    iconClassName,
    textClassName,
    showText = true
}: LogoProps) {
    return (
        <div className={cn("flex items-center gap-2 font-bold select-none", className)}>
            <div className={cn(
                "flex items-center justify-center rounded-xl bg-primary/10 p-2",
                iconClassName
            )}>
                <BookOpen className="h-6 w-6 text-primary" />
            </div>
            {showText && (
                <span className={cn(
                    "text-xl tracking-tight text-foreground",
                    textClassName
                )}>
                    ExamHelper
                </span>
            )}
        </div>
    );
}
