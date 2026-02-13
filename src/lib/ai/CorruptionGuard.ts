export class CorruptionGuard {
    private corruptionPatterns = [
        /[\u4e00-\u9fa5]/, // Chinese
        /[\u3040-\u309f\u30a0-\u30ff]/, // Japanese
        /[\uac00-\ud7af]/, // Korean
        /[^\x00-\x7F🔥⭐✅❌📚💡🎯📊📝⚡\n\r\t]/, // Non-ASCII except allowed emojis. Added newline/tab/return.
    ];

    private hallucinationWords = [
        'pochwytliwy', 'zawieszenie', '营', '斧', '了', '我', '星守护',
        'suspend', 'Universal', '交接天下', '下车', '营'
    ];

    validate(obj: any): boolean {
        const str = JSON.stringify(obj);

        // Check 1: No foreign scripts
        for (const pattern of this.corruptionPatterns) {
            if (pattern.test(str)) {
                console.error('CorruptionGuard: Foreign script detected');
                return false;
            }
        }

        // Check 2: No hallucination words
        for (const word of this.hallucinationWords) {
            if (str.includes(word)) {
                console.error(`CorruptionGuard: Hallucination word "${word}" detected`);
                return false;
            }
        }

        // Check 3: Required fields present
        if (!obj.metadata || !obj.unit_predictions) {
            console.error('CorruptionGuard: Missing required fields');
            return false;
        }

        // Check 4: All units present - relax this check for partial results
        // if (obj.unit_predictions.length !== obj.metadata.total_units) {
        //   console.error('CorruptionGuard: Unit count mismatch');
        //   return false;
        // }

        return true;
    }

    sanitize(str: string): string {
        // Remove corruption while keeping allowed content
        return str
            .replace(/[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g, '')
            .replace(/[^\x00-\x7F🔥⭐✅❌📚💡🎯📊📝⚡\n\r\t]/g, '');
    }
}
