import { apiUrl } from '@/lib/api';

type ExplanationType = 'explain' | 'deep' | 'summary';

interface StreamCallbacks {
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

interface StructuredAnswer {
  title?: string;
  definition?: string;
  important_points?: string[];
  exam_answer?: string;
}

function answerToMarkdown(answer: StructuredAnswer) {
  const sections: string[] = [];

  if (answer.title) {
    sections.push(`### ${answer.title}`);
  }

  if (answer.definition) {
    sections.push(`**Definition:** ${answer.definition}`);
  }

  if (answer.important_points?.length) {
    sections.push(`**Important Points:**\n${answer.important_points.map((point) => `- ${point}`).join('\n')}`);
  }

  if (answer.exam_answer) {
    sections.push(`**Exam Answer:**\n${answer.exam_answer}`);
  }

  return sections.join('\n\n');
}

export async function streamAIExplanation(
  question: string,
  answer: string | null,
  type: ExplanationType,
  callbacks: StreamCallbacks
): Promise<void> {
  const { onDelta, onDone, onError } = callbacks;

  try {
    const response = await fetch(apiUrl('/api/ai/answer'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        context: answer,
        mode: type,
      }),
    });

    if (!response.ok) {
      onError('Temporary AI issue. Please retry.');
      return;
    }

    const data = await response.json() as StructuredAnswer;
    onDelta(answerToMarkdown(data));
    onDone();
  } catch (error) {
    console.error('AI Service Error:', error);
    onError('Temporary AI issue. Please retry.');
  }
}
