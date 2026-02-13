import React from 'react';
import { cn } from "@/lib/utils";
import {
    Eye,
    Globe,
    Database,
    Brain,
    Layout,
    CheckCircle2,
    Loader2,
    Sparkles
} from "lucide-react";

export type PipelineStage = 'vision' | 'search' | 'fusion' | 'brain' | 'presentation';

interface AnalysisPipelineProps {
    currentStage: PipelineStage;
    isComplete?: boolean;
    className?: string;
    statusText?: string;
}

const PIPELINE_STEPS = [
    {
        id: 'vision',
        label: 'VISION',
        subLabel: 'Structured JSON Extraction',
        tool: 'Qwen 2.5 VL',
        icon: Eye,
        color: 'text-blue-500',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20'
    },
    {
        id: 'search',
        label: 'SEARCH',
        subLabel: 'Perplexity Data Gathering',
        tool: 'Perplexity AI',
        icon: Globe,
        color: 'text-amber-500',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20'
    },
    {
        id: 'fusion',
        label: 'FUSION',
        subLabel: 'Gemini Data Architect',
        tool: 'Gemini 2.0 Flash',
        icon: Database,
        color: 'text-purple-500',
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/20'
    },
    {
        id: 'brain',
        label: 'BRAIN',
        subLabel: 'Prediction Engine',
        tool: 'Gemini 2.0 Flash',
        icon: Brain,
        color: 'text-rose-500',
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/20'
    },
    {
        id: 'presentation',
        label: 'PRESENTATION',
        subLabel: 'Visualization Layer',
        tool: 'React UI',
        icon: Layout,
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20'
    }
];

export function AnalysisPipeline({ currentStage, isComplete, className, statusText }: AnalysisPipelineProps) {
    const currentIndex = PIPELINE_STEPS.findIndex(step => step.id === currentStage);

    return (
        <div className={cn("w-full max-w-lg mx-auto p-4 space-y-6", className)}>
            <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-foreground flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                    Analysis In Progress
                </h3>
                <p className="text-sm text-muted-foreground">Orchestrating AI agents...</p>
            </div>

            <div className="relative space-y-4">
                {/* Connecting Line (Vertical) */}
                <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-border -z-10" />

                {PIPELINE_STEPS.map((step, index) => {
                    const isActive = index === currentIndex;
                    const isPast = index < currentIndex || isComplete;
                    const isFuture = index > currentIndex && !isComplete;

                    return (
                        <div
                            key={step.id}
                            className={cn(
                                "relative flex items-center gap-4 p-3 rounded-xl border transition-all duration-300",
                                isActive ? "bg-card shadow-lg scale-105 border-primary/50" : "border-transparent",
                                isPast ? "opacity-70 grayscale-[0.5]" : "",
                                isFuture ? "opacity-40" : ""
                            )}
                        >
                            {/* Icon Container */}
                            <div
                                className={cn(
                                    "relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300",
                                    isActive ? cn(step.bg, step.border, step.color, "animate-pulse shadow-[0_0_15px_rgba(0,0,0,0.1)]") : "bg-card border-border",
                                    isPast ? cn("bg-primary/10 border-primary text-primary") : ""
                                )}
                            >
                                {isActive ? (
                                    <Loader2 className={cn("w-6 h-6 animate-spin", step.color)} />
                                ) : isPast ? (
                                    <CheckCircle2 className="w-6 h-6" />
                                ) : (
                                    <step.icon className="w-5 h-5 text-muted-foreground" />
                                )}
                            </div>

                            {/* Text Content */}
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <h4 className={cn(
                                        "font-bold text-sm tracking-wide",
                                        isActive ? step.color : "text-muted-foreground"
                                    )}>
                                        PHASE {index + 1}: {step.label}
                                    </h4>
                                    {isActive && (
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-background border border-border animate-pulse">
                                            PROCESSING
                                        </span>
                                    )}
                                </div>

                                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                                    {(isActive && statusText) ? statusText : step.subLabel}
                                </p>

                                <div className="flex items-center gap-1.5 mt-1.5">
                                    <div className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-green-500 animate-pulse" : "bg-muted")} />
                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold">
                                        Tool: {step.tool}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
