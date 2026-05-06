import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { apiUrl } from '@/lib/api';

interface AnalysisResult {
    fullText: string;
    extractedSubject: string;
}

interface UseSyllabusAnalysisProps {
    sessionId: string;
    selectedDepartment: { name: string; fullName: string } | null;
    panicMode: boolean;
    onSuccess: (result: string, subject?: string) => void;
}

export type PipelineStage = 'vision' | 'search' | 'fusion' | 'brain' | 'presentation';

export const useSyllabusAnalysis = ({
    sessionId,
    selectedDepartment,
    panicMode,
    onSuccess
}: UseSyllabusAnalysisProps) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [stage, setStage] = useState('');
    const [pipelineStage, setPipelineStage] = useState<PipelineStage>('vision');

    // Helper to extract subject name from analysis result
    const extractSubjectFromResult = (text: string): string | null => {
        const patterns = [
            /Subject[:\s]+([A-Za-z\s&]+?)(?:\n|,|\.|$)/i,
            /SUBJECT NAME[:\s]+([A-Za-z\s&]+?)(?:\n|,|\.|$)/i,
            /analyzing[:\s]+([A-Za-z\s&]+?)(?:\n|,|\.|syllabus)/i,
            /for[:\s]+([A-Za-z\s&]+?)(?:\n|,|\.|syllabus)/i,
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1] && match[1].trim().length > 3) {
                return match[1].trim();
            }
        }
        return null;
    };

    const saveToHistory = async (department: string, subject: string, analysisResult: string) => {
        try {
            const { data } = await supabase.auth.getUser();
            const { error } = await supabase
                .from('jntuh_analysis_history')
                .insert({
                    session_id: sessionId,
                    department,
                    subject,
                    result: analysisResult,
                    user_id: data.user?.id || null,
                });

            if (error) {
                console.error('Error saving to history:', error);
                // Fallback to local storage if needed, or just log error
                const localHistory = JSON.parse(localStorage.getItem('jntuh_history') || '[]');
                localHistory.unshift({
                    id: Date.now().toString(),
                    department,
                    subject,
                    result: analysisResult,
                    created_at: new Date().toISOString(),
                });
                localStorage.setItem('jntuh_history', JSON.stringify(localHistory.slice(0, 20)));
            }
        } catch (error) {
            console.error('Error saving history:', error);
        }
    };

    const analyzeSyllabus = async (imageBase64: string, goal: 'pass' | 'high_marks') => {
        if (!selectedDepartment) {
            toast.error('Please select a department first');
            return;
        }

        setIsProcessing(true);
        setStage('Initializing analysis pipeline...');
        setPipelineStage('vision'); // Start at vision

        try {
            const response = await fetch(apiUrl('/api/syllabus/analyze'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image_base64: imageBase64,
                    department: selectedDepartment.fullName,
                    goal,
                    panic_mode: panicMode,
                }),
            });

            if (!response.ok) {
                throw new Error('API failed to analyze syllabus');
            }

            const data = await response.json();
            const fullText = data.analysis || '';
            const backendSubjectHint = data.subject_hint || '';

            if (fullText.trim()) {
                setPipelineStage('presentation');
                const subject = backendSubjectHint || extractSubjectFromResult(fullText);
                onSuccess(fullText, subject || undefined);
                toast.success('Analysis complete!');
            } else {
                toast.error('Analysis produced no results. Please try again.');
                setPipelineStage('vision');
            }

            setStage('');
        } catch (error) {
            console.error('Error:', error);
            const message = error instanceof Error ? error.message : 'Unknown error occurred';

            if (message.includes('Missing Configuration') || message.includes('API keys not configured')) {
                toast.error('Configuration Error', {
                    description: message
                });
            } else {
                toast.error('Analysis Failed', {
                    description: message
                });
            }
        } finally {
            setIsProcessing(false);
            setStage('');
        }
    };

    return {
        analyzeSyllabus,
        isProcessing,
        stage,
        pipelineStage
    };
};
