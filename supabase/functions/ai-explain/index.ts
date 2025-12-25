import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Stage 1: Initial research and context gathering
async function stage1_Research(query: string, apiKey: string): Promise<string> {
  console.log("=== STAGE 1: Research & Context ===");
  
  try {
    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert JNTUH exam analyst. Provide concise, accurate information about exam topics, syllabus coverage, and important concepts.'
          },
          {
            role: 'user',
            content: `Research and provide key information about this JNTUH R22 exam topic:

Topic: ${query}

Focus on:
1. Core concepts and definitions
2. Important formulas and theorems
3. Key topics from the syllabus
4. Common question patterns

Keep it focused and exam-relevant.`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Stage 1 error:', response.status, errorText);
      return "";
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "";
    console.log("Stage 1 completed. Result length:", result.length);
    return result;
  } catch (error) {
    console.error('Error in Stage 1:', error);
    return "";
  }
}

// Stage 2: Deep analysis and concept breakdown
async function stage2_Analysis(question: string, answer: string | null, context: string, type: string, apiKey: string): Promise<string> {
  console.log("=== STAGE 2: Deep Analysis ===");
  
  let prompt = '';
  
  if (type === 'explain') {
    prompt = `Analyze this question for JNTUH exam:

RESEARCH CONTEXT:
${context}

QUESTION: ${question}
${answer ? `ANSWER: ${answer}` : ''}

Provide:
1. **Concept Foundation**: Core principles
2. **Technical Breakdown**: Step-by-step explanation
3. **Key Terms**: Important terminology
4. **Related Concepts**: Connected topics`;
  } else if (type === 'deep') {
    prompt = `Perform comprehensive analysis for JNTUH exam:

RESEARCH CONTEXT:
${context}

QUESTION: ${question}
${answer ? `ANSWER: ${answer}` : ''}

Analyze:
1. **Theoretical Framework**: Underlying theory
2. **Mathematical Aspects**: Formulas and derivations
3. **Practical Applications**: Real-world use cases
4. **Comparative Analysis**: Similar concepts`;
  } else if (type === 'summary') {
    prompt = `Create revision material for JNTUH R22 exam:

RESEARCH CONTEXT:
${context}

CONTENT: ${question}

Generate:
1. **Key Points**: Important facts per unit
2. **High Probability Topics**: Likely exam questions
3. **Formula Sheet**: Critical formulas
4. **Quick Revision Notes**: Bullet points`;
  }

  try {
    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a senior JNTUH professor with 20+ years experience. Provide thorough, exam-focused analysis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Stage 2 error:', response.status, errorText);
      return "";
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "";
    console.log("Stage 2 completed. Result length:", result.length);
    return result;
  } catch (error) {
    console.error('Error in Stage 2:', error);
    return "";
  }
}

// Stage 3: Final synthesis with streaming
async function stage3_Synthesis(
  question: string, 
  answer: string | null, 
  stage1: string, 
  stage2: string,
  type: string, 
  apiKey: string
): Promise<Response> {
  console.log("=== STAGE 3: Final Synthesis (Streaming) ===");
  
  let systemPrompt = `You are an elite educational AI for JNTUH R22 exam preparation.
You have been provided with research and analysis from previous stages.
Synthesize everything into a comprehensive, well-structured response.
Focus on high-probability content and exam patterns.
Use clear formatting with headers, bullet points, and highlights.`;

  let userPrompt = '';
  
  if (type === 'explain') {
    userPrompt = `SYNTHESIZE INTO THE ULTIMATE EXPLANATION:

=== RESEARCH ===
${stage1}

=== ANALYSIS ===
${stage2}

ORIGINAL QUESTION: ${question}
${answer ? `ANSWER: ${answer}` : ''}

Create a clear, comprehensive explanation that:
- Is easy to understand
- Covers all important aspects
- Provides exam tips
- Shows how to answer in exams

Format with clear sections and bullet points.`;
  } else if (type === 'deep') {
    userPrompt = `CREATE COMPREHENSIVE DEEP ANALYSIS:

=== RESEARCH ===
${stage1}

=== ANALYSIS ===
${stage2}

QUESTION: ${question}
${answer ? `ANSWER: ${answer}` : ''}

Provide the complete analysis with:
1. **Complete Understanding**: Everything needed
2. **Step-by-Step Mastery**: Logical progression
3. **Exam Excellence**: How to score maximum marks
4. **High Probability Questions**: Likely exam questions
5. **Memory Tips**: Techniques to remember
6. **Practice Guidance**: How to practice

Make it thorough but well-organized.`;
  } else if (type === 'summary') {
    userPrompt = `CREATE ULTIMATE REVISION SUMMARY:

=== RESEARCH ===
${stage1}

=== ANALYSIS ===
${stage2}

CONTENT: ${question}

Generate:
1. **Priority Topics**: Ranked by exam probability
2. **Must-Know List**: Essential content
3. **Formula Quick Reference**: All key formulas
4. **30-Minute Revision Guide**: Last-minute prep
5. **Question Predictions**: Most likely questions
6. **Scoring Tips**: Maximize marks

Make it concise and actionable.`;
  }

  const response = await fetch(LOVABLE_AI_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      stream: true,
    }),
  });

  return response;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, answer, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`\n========================================`);
    console.log(`Processing ${type} request with 3-Stage Analysis`);
    console.log(`Query: ${question.substring(0, 100)}...`);
    console.log(`========================================\n`);

    // Stage 1: Research
    const searchQuery = type === 'summary' ? question.slice(0, 500) : question;
    const stage1 = await stage1_Research(searchQuery, LOVABLE_API_KEY);
    
    // Stage 2: Analysis
    const stage2 = await stage2_Analysis(question, answer, stage1, type, LOVABLE_API_KEY);

    // Stage 3: Final Synthesis with streaming
    const response = await stage3_Synthesis(
      question, 
      answer, 
      stage1,
      stage2,
      type, 
      LOVABLE_API_KEY
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    console.log("All stages complete. Streaming final response...");

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
