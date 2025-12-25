import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Gemini grounding search for real-time context
async function searchWithGemini(query: string, apiKey: string): Promise<string> {
  console.log("Performing grounding search with Gemini for:", query);
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `Search and find the most relevant, accurate, and up-to-date information about this topic for exam preparation. Focus on key concepts, definitions, and important details:\n\n${query}` }]
          }],
          tools: [{
            google_search: {}
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2000
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini grounding search error:', response.status, errorText);
      return "";
    }

    const data = await response.json();
    const searchResult = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("Grounding search result length:", searchResult.length);
    return searchResult;
  } catch (error) {
    console.error('Error in Gemini grounding search:', error);
    return "";
  }
}

// Deep analysis with Gemini 2.5 Pro
async function analyzeWithGeminiPro(question: string, answer: string | null, searchContext: string, type: string, apiKey: string): Promise<string> {
  console.log("Performing deep analysis with Gemini 2.5 Pro");
  
  let systemPrompt = '';
  let userPrompt = '';

  if (type === 'explain') {
    systemPrompt = 'You are an expert educational assistant. Provide clear, concise explanations with practical examples.';
    userPrompt = `Using the research context below, explain this exam question simply:

Research Context:
${searchContext}

Question: ${question}
${answer ? `Answer: ${answer}` : '(No answer provided)'}

Provide a clear, student-friendly explanation.`;
  } else if (type === 'deep') {
    systemPrompt = 'You are an expert educational analyst with deep reasoning capabilities. Provide thorough, multi-layered analysis.';
    userPrompt = `Using the research context below, perform a comprehensive deep analysis:

Research Context:
${searchContext}

Question: ${question}
${answer ? `Answer: ${answer}` : '(No answer provided)'}

Provide:
1. **Core Concept Analysis**: Break down fundamental concepts
2. **Step-by-Step Reasoning**: Logical steps to the answer
3. **Related Topics**: Connect to broader concepts
4. **Common Mistakes**: Typical student errors
5. **Memory Tips**: Mnemonics and techniques
6. **Practice Application**: Real-world examples`;
  } else if (type === 'summary') {
    systemPrompt = 'You are an expert educational assistant creating comprehensive revision summaries.';
    userPrompt = `Using the research context below, create a revision summary:

Research Context:
${searchContext}

Questions to summarize:
${question}

Structure your summary as:
1. **Key Themes**: Main topics covered
2. **Essential Concepts**: Must-know information
3. **Quick Reference**: Critical facts bullet points
4. **Study Priority**: Focus areas based on patterns
5. **Exam Tips**: Strategies for similar questions`;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{
            parts: [{ text: userPrompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4000
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini Pro analysis error:', response.status, errorText);
      return "";
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (error) {
    console.error('Error in Gemini Pro analysis:', error);
    return "";
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, answer, type } = await req.json();
    const KIMI2_API_KEY = Deno.env.get('KIMI2_API_KEY');
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    
    if (!KIMI2_API_KEY) {
      throw new Error("KIMI2_API_KEY is not configured");
    }
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    console.log(`Processing ${type} request with Gemini Grounding + Kimi2 Thinking`);

    // Step 1: Use Gemini grounding search for real-time context
    const searchQuery = type === 'summary' ? question.slice(0, 500) : question;
    const searchContext = await searchWithGemini(searchQuery, GEMINI_API_KEY);
    
    // Step 2: Use Gemini 2.5 Pro for initial analysis with search context
    const geminiAnalysis = await analyzeWithGeminiPro(question, answer, searchContext, type, GEMINI_API_KEY);

    // Step 3: Use Kimi2 thinking model for enhanced reasoning with all context
    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'explain') {
      systemPrompt = `You are an expert educational assistant with advanced reasoning capabilities. 
You have access to real-time search results and initial analysis. 
Synthesize all information to provide the clearest, most accurate explanation possible.`;
      userPrompt = `Using the following research and analysis, provide the best possible explanation:

Real-Time Research:
${searchContext}

Initial Analysis:
${geminiAnalysis}

Original Question: ${question}
${answer ? `Answer: ${answer}` : '(No answer provided)'}

Synthesize everything into a clear, comprehensive explanation that helps students truly understand the concept.`;
    } else if (type === 'deep') {
      systemPrompt = `You are an expert educational analyst with deep thinking and reasoning capabilities.
Use multi-step reasoning to analyze every aspect thoroughly.
You have access to real-time research and initial analysis to enhance your response.`;
      userPrompt = `Perform the deepest possible analysis using all available information:

Real-Time Research:
${searchContext}

Initial Analysis:
${geminiAnalysis}

Original Question: ${question}
${answer ? `Answer: ${answer}` : '(No answer provided)'}

Think step-by-step and provide:
1. **Core Concept Analysis**: Fundamental concepts with deep reasoning
2. **Step-by-Step Reasoning**: Complete logical chain to the answer
3. **Related Topics**: Connections to broader subject areas
4. **Common Mistakes**: Why students get this wrong and how to avoid it
5. **Memory Tips**: Effective mnemonics and memory techniques
6. **Practice Application**: Real-world examples and similar problems
7. **Key Insights**: Most important takeaways from your analysis`;
    } else if (type === 'summary') {
      systemPrompt = `You are an expert educational assistant creating the most comprehensive revision summaries.
Use deep analysis and real-time research to create the ultimate study guide.`;
      userPrompt = `Create the ultimate revision summary using all available research:

Real-Time Research:
${searchContext}

Initial Analysis:
${geminiAnalysis}

Questions to summarize:
${question}

Create the most comprehensive summary with:
1. **Key Themes**: Main topics with detailed explanations
2. **Essential Concepts**: Must-know information for each theme
3. **Quick Reference**: Bullet points of critical facts
4. **Study Priority**: What to focus on based on patterns
5. **Exam Tips**: Strategies for answering similar questions
6. **Common Pitfalls**: Mistakes to avoid
7. **Memory Aids**: Mnemonics and study techniques`;
    } else {
      throw new Error("Invalid explanation type");
    }

    // Use Kimi2 API for final synthesis with thinking capability
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
