import { supabase } from '@/integrations/supabase/client';

type ExplanationType = 'explain' | 'deep' | 'summary';

interface StreamCallbacks {
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

export async function streamAIExplanation(
  question: string,
  answer: string | null,
  type: ExplanationType,
  callbacks: StreamCallbacks
): Promise<void> {
  const { onDelta, onDone, onError } = callbacks;

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-explain`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ question, answer, type }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      onError(errorData.error || `Error: ${response.status}`);
      return;
    }

    if (!response.body) {
      onError('No response body');
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') {
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch {
          // Re-buffer incomplete JSON
          textBuffer = line + '\n' + textBuffer;
          break;
        }
      }
    }

    // Final flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split('\n')) {
        if (!raw) continue;
        if (raw.endsWith('\r')) raw = raw.slice(0, -1);
        if (raw.startsWith(':') || raw.trim() === '') continue;
        if (!raw.startsWith('data: ')) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch {
          /* ignore */
        }
      }
    }

    onDone();
  } catch (error) {
    console.error('AI Service Error:', error);
    onError(error instanceof Error ? error.message : 'Failed to get AI explanation');
  }
}
