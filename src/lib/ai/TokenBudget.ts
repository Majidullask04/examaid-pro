import { UnitData, SyllabusData, ProcessingBudget } from '@/types/examaid';

export class TokenBudget {
    private readonly MAX_TOKENS_PER_REQUEST = 12000; // Safe limit for standard models
    private readonly CHARS_PER_TOKEN = 3.5; // Average approximation

    calculate(unit: UnitData, fullSyllabus: SyllabusData): ProcessingBudget {
        // Estimate input size
        const contextSize = JSON.stringify(fullSyllabus).length; // Full syllabus context
        const unitSize = JSON.stringify(unit).length;
        const promptOverhead = 2000; // Instructions, examples, etc.

        const estimatedInputTokens = (contextSize + unitSize + promptOverhead) / this.CHARS_PER_TOKEN;

        // Determine Output needs (10 questions * 300 words + study plan etc) -> approx 4000 tokens
        const requiredOutputTokens = 4000;

        const totalEstimated = estimatedInputTokens + requiredOutputTokens;

        if (totalEstimated > this.MAX_TOKENS_PER_REQUEST) {
            return {
                strategy: 'chunked',
                maxOutputTokens: 4000,
                estimatedCost: totalEstimated
            };
        }

        return {
            strategy: 'single',
            maxOutputTokens: requiredOutputTokens,
            estimatedCost: totalEstimated
        };
    }
}
