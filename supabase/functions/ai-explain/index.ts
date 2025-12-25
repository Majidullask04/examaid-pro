import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, answer, type } = await req.json();
    const KIMI2_API_KEY = Deno.env.get('KIMI2_API_KEY');
    
    if (!KIMI2_API_KEY) {
      throw new Error("KIMI2_API_KEY is not configured");
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'explain') {
      systemPrompt = `You are an expert educational assistant. Provide clear, concise explanations for exam questions. 
Focus on making the concept easy to understand with practical examples.`;
      userPrompt = `Explain this exam question and its answer in a simple way:

Question: ${question}
${answer ? `Answer: ${answer}` : '(No answer provided)'}

Provide a clear explanation that helps students understand the concept.`;
    } else if (type === 'deep') {
      systemPrompt = `You are an expert educational assistant with deep analytical capabilities. 
Use your advanced reasoning to provide thorough, multi-layered analysis of exam questions.
Think step-by-step and explore all relevant concepts, connections, and implications.`;
      userPrompt = `Perform a deep analysis of this exam question:

Question: ${question}
${answer ? `Answer: ${answer}` : '(No answer provided)'}

Provide:
1. **Core Concept Analysis**: Break down the fundamental concepts being tested
2. **Step-by-Step Reasoning**: Walk through the logical steps to arrive at the answer
3. **Related Topics**: Connect this to broader concepts in the subject
4. **Common Mistakes**: What errors do students typically make?
5. **Memory Tips**: Provide mnemonics or techniques to remember this
6. **Practice Application**: Give an example of how to apply this knowledge`;
    } else if (type === 'summary') {
      systemPrompt = `You are an expert educational assistant creating comprehensive revision summaries.
Analyze all provided questions to identify key themes, patterns, and essential knowledge.`;
      userPrompt = `Create a comprehensive revision summary for these exam questions:

${question}

Structure your summary as:
1. **Key Themes**: Main topics covered
2. **Essential Concepts**: Must-know information for each theme
3. **Quick Reference**: Bullet points of critical facts
4. **Study Priority**: What to focus on based on question patterns
5. **Exam Tips**: Strategies for answering similar questions`;
    } else {
      throw new Error("Invalid explanation type");
    }

    console.log(`Processing ${type} request with Kimi2 Thinking API`);

    // Use Kimi2 API (Moonshot AI) with thinking capability
    const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIMI2_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'kimi-k2-0711-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: true,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Kimi2 API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "API credits exhausted. Please add more credits." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`Kimi2 API error: ${response.status} - ${errorText}`);
    }

    // Stream the response
    return new Response(response.body, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Error in ai-explain function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
