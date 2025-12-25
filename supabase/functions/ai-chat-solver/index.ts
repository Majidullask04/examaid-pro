import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const EXAM_SYSTEM_PROMPT = `You are an expert JNTUH exam preparation assistant. Your role is to provide answers that students can directly use on their exam answer sheets.

## Answer Format Guidelines:

1. **Structure your answers for exam sheets:**
   - Start with a clear definition (1-2 sentences)
   - Use numbered points for explanations
   - Include diagrams descriptions where applicable
   - Add formulas with explanations
   - Provide examples when relevant

2. **Mark allocation awareness:**
   - For 2-mark questions: Definition + 2-3 key points
   - For 5-mark questions: Definition + detailed explanation + diagram/example
   - For 10-mark questions: Comprehensive coverage with multiple sections

3. **Formatting:**
   - Use headers (##, ###) for sections
   - Use bullet points and numbered lists
   - Highlight key terms in **bold**
   - Include ASCII diagrams or describe what diagram to draw

4. **Key sections to include:**
   - Definition/Introduction
   - Key Points/Features
   - Diagram (if applicable)
   - Formula (if applicable)
   - Example (if applicable)
   - Advantages/Disadvantages (if relevant)

5. **Be direct and exam-focused:**
   - No unnecessary explanations
   - Focus on what examiners look for
   - Include marks distribution suggestions

Remember: Students will write these answers directly on their exam papers, so be precise and well-structured.`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, messages = [] } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      throw new Error('AI service is not configured');
    }

    console.log('Processing question:', question);
    console.log('Conversation history length:', messages.length);

    // Build conversation with system prompt
    const conversationMessages = [
      { role: 'system', content: EXAM_SYSTEM_PROMPT },
      ...messages.map((m: Message) => ({
        role: m.role,
        content: m.content
      })),
      { role: 'user', content: question }
    ];

    // Use Lovable AI Gateway with streaming
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: conversationMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    console.log('Streaming response started');

    // Return the stream directly
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in ai-chat-solver:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
