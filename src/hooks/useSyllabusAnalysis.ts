import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-syllabus`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                    'Content-Type': 'application/json',
                    'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                    'x-session-id': sessionId,
                },
                body: JSON.stringify({
                    imageBase64,
                    department: selectedDepartment.fullName,
                    studyGoal: goal,
                    panicMode,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error || `API error: ${response.status}`;

                if (errorMessage.includes('API keys not configured')) {
                    throw new Error(errorMessage);
                } else if (errorMessage.includes('Image is required')) {
                    throw new Error('Please upload a valid image file.');
                } else if (errorMessage.includes('Vision API error')) {
                    throw new Error('AI Vision failed to read the image. Please try a clearer photo.');
                }

                throw new Error(errorMessage);
            }

            // We have a response, meaning Vision (server-side) and Search (server-side) are mostly done or acting.
            // But we'll wait for the stream events to confirm. 
            // Actually, since the server handles Qwen/Perplexity BEFORE returning response, 
            // we can assume we are transitioning to Fusion/Brain once we get headers, 
            // but let's rely on the stream events for precision.

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let fullText = '';
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);

                            // Handle new Pipeline Events
                            if (parsed.type === 'pipeline_event') {
                                const { stage: pStage, status } = parsed;
                                // Map backend stages to frontend pipeline stages
                                if (pStage === 'vision' && status === 'complete') setPipelineStage('search');
                                else if (pStage === 'search' && status === 'complete') setPipelineStage('fusion');
                                else if (pStage === 'fusion') setPipelineStage('fusion');
                                else if (pStage === 'brain') setPipelineStage('brain');

                                // Update text description
                                setStage(parsed.details || `Entering ${pStage} phase...`);
                                continue;
                            }

                            // Fallback for legacy/content events
                            if (parsed.stage === 'web_search_complete') {
                                setPipelineStage('fusion');
                                setStage('Stage 2: Searching JNTUH papers (2019-2024)...');
                            } else if (parsed.stage === 'analysis' && parsed.content) {
                                setPipelineStage('brain');
                                fullText += parsed.content;
                                // Live update optional, here we just accumulate
                                // If we want live updates, we need to pass a callback

                                if (fullText.includes('METHODOLOGY')) {
                                    setStage('Stage 3: Building methodology & hit ratios...');
                                }
                                if (fullText.includes('YEAR-WISE HIT RATIO') || fullText.includes('Hit Ratio')) {
                                    setStage('Stage 4: Generating high probability questions...');
                                }
                                if (fullText.includes('HIGH PROBABILITY QUESTIONS')) {
                                    setStage('Stage 4: Generating high probability questions...');
                                }
                                if (fullText.includes('SUGGESTED APPROACH') || fullText.includes('Phase 1:')) {
                                    setStage('Stage 5: Creating study approach...');
                                }
                            }
                        } catch {
                            // Skip invalid JSON
                        }
                    }
                }
            }

            if (fullText.trim()) {
                setPipelineStage('presentation'); // Final stage
                const subject = extractSubjectFromResult(fullText);
                onSuccess(fullText, subject || undefined);
                toast.success('Analysis complete!');
            } else {
                console.error('Stream ended but fullText is empty. Buffer:', buffer);
                toast.error('Analysis produced no results. Please try again.');
                setPipelineStage('vision'); // Reset
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

