import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Analysis 1: Gemini Flash - Grounding search for real-time context
async function analysis1_GroundingSearch(query: string, apiKey: string): Promise<string> {
  console.log("=== ANALYSIS 1: Gemini Flash Grounding Search ===");
  console.log("Query:", query);
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `Search and find the most relevant, accurate, and up-to-date information about this topic for JNTUH R22 exam preparation. Focus on:
- Key concepts and definitions from official syllabus
- Important formulas and theorems
- Previous year question patterns
- High probability topics

Topic: ${query}` }]
          }],
          tools: [{
            google_search: {}
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2500
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Analysis 1 error:', response.status, errorText);
      return "";
    }

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("Analysis 1 completed. Result length:", result.length);
    return result;
  } catch (error) {
    console.error('Error in Analysis 1:', error);
    return "";
  }
}

// Analysis 2: Gemini Pro - Deep concept breakdown
async function analysis2_ConceptBreakdown(question: string, answer: string | null, groundingContext: string, type: string, apiKey: string): Promise<string> {
  console.log("=== ANALYSIS 2: Gemini Pro Concept Breakdown ===");
  
  let prompt = '';
  
  if (type === 'explain') {
    prompt = `As an expert JNTUH professor, analyze this question comprehensively:

GROUNDING RESEARCH:
${groundingContext}

QUESTION: ${question}
${answer ? `ANSWER: ${answer}` : ''}

Provide:
1. **Concept Foundation**: Core underlying principles
2. **Technical Breakdown**: Step-by-step explanation
3. **Key Terms**: Important terminology with definitions
4. **Diagram Description**: Visual representation if applicable
5. **Related Concepts**: Connected topics from syllabus`;
  } else if (type === 'deep') {
    prompt = `Perform exhaustive academic analysis for JNTUH exam preparation:

GROUNDING RESEARCH:
${groundingContext}

QUESTION: ${question}
${answer ? `ANSWER: ${answer}` : ''}

Analyze:
1. **Theoretical Framework**: Underlying theory and principles
2. **Mathematical Derivation**: Formulas and proofs if applicable
3. **Practical Applications**: Real-world use cases
4. **Comparative Analysis**: Similar concepts and differences
5. **Historical Context**: Evolution of the concept
6. **Advanced Extensions**: Higher-level implications`;
  } else if (type === 'summary') {
    prompt = `Create comprehensive revision material for JNTUH R22 exam:

GROUNDING RESEARCH:
${groundingContext}

CONTENT TO SUMMARIZE:
${question}

Generate:
1. **Unit-wise Key Points**: Important facts per unit
2. **High Probability Topics**: Most likely exam questions
3. **Formula Sheet**: Critical formulas and equations
4. **Quick Revision Notes**: Bullet points for last-minute study
5. **Pattern Analysis**: Previous year question patterns`;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: 'You are a senior JNTUH professor with 20+ years of experience in creating exam questions. Provide thorough, exam-focused analysis.' }] },
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 4000
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Analysis 2 error:', response.status, errorText);
      return "";
    }

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("Analysis 2 completed. Result length:", result.length);
    return result;
  } catch (error) {
    console.error('Error in Analysis 2:', error);
    return "";
  }
}

// Analysis 3: Gemini Pro - Exam strategy and patterns
async function analysis3_ExamStrategy(question: string, answer: string | null, groundingContext: string, conceptBreakdown: string, type: string, apiKey: string): Promise<string> {
  console.log("=== ANALYSIS 3: Gemini Pro Exam Strategy ===");
  
  let prompt = '';
  
  if (type === 'explain') {
    prompt = `Based on the previous analyses, create exam-focused strategy:

GROUNDING RESEARCH:
${groundingContext}

CONCEPT ANALYSIS:
${conceptBreakdown}

ORIGINAL QUESTION: ${question}
${answer ? `ANSWER: ${answer}` : ''}

Provide:
1. **Answer Template**: How to structure the answer in exam
2. **Marks Distribution**: Estimated marks for each section
3. **Time Management**: Recommended time to spend
4. **Common Mistakes**: Errors students make
5. **Scoring Tips**: How to maximize marks`;
  } else if (type === 'deep') {
    prompt = `Create comprehensive exam mastery guide:

GROUNDING RESEARCH:
${groundingContext}

CONCEPT ANALYSIS:
${conceptBreakdown}

QUESTION: ${question}
${answer ? `ANSWER: ${answer}` : ''}

Generate:
1. **Complete Answer Framework**: Full answer structure
2. **Diagram Guidelines**: What diagrams to include
3. **Alternative Approaches**: Different ways to answer
4. **Cross-linking Topics**: Related questions that might appear
5. **Model Answer**: Perfect answer format
6. **Memory Techniques**: Mnemonics and shortcuts`;
  } else if (type === 'summary') {
    prompt = `Generate unit-wise high probability analysis:

GROUNDING RESEARCH:
${groundingContext}

CONCEPT ANALYSIS:
${conceptBreakdown}

CONTENT:
${question}

Produce:
1. **Probability Ranking**: Topics ranked by exam likelihood
2. **Must-Read Sections**: Critical portions
3. **Skip-able Content**: Lower priority areas
4. **Question Predictions**: Likely questions this exam
5. **Last-Minute Checklist**: 30-minute revision guide
6. **Previous Year Patterns**: Trend analysis`;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: 'You are an exam preparation specialist who has analyzed 10+ years of JNTUH question papers. Focus on practical exam strategies.' }] },
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 4000
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Analysis 3 error:', response.status, errorText);
      return "";
    }

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("Analysis 3 completed. Result length:", result.length);
    return result;
  } catch (error) {
    console.error('Error in Analysis 3:', error);
    return "";
  }
}

// Final Polish: DeepSeek R1 - Deep reasoning synthesis
async function finalPolish_DeepSeekR1(
  question: string, 
  answer: string | null, 
  analysis1: string, 
  analysis2: string, 
  analysis3: string,
  type: string, 
  apiKey: string
): Promise<Response> {
  console.log("=== FINAL POLISH: DeepSeek R1 Reasoning ===");
  
  let systemPrompt = `You are an elite educational AI with advanced reasoning capabilities.
You have been provided with THREE layers of analysis:
1. Real-time grounding research
2. Deep concept breakdown
3. Exam strategy analysis

Your job is to synthesize ALL of this into the ULTIMATE response.
Think step-by-step, reason through each piece of information, and create the most comprehensive, accurate, and helpful response possible.
Focus on JNTUH R22 exam patterns and high-probability content.`;

  let userPrompt = '';
  
  if (type === 'explain') {
    userPrompt = `SYNTHESIZE ALL ANALYSES INTO THE ULTIMATE EXPLANATION:

=== ANALYSIS 1: GROUNDING RESEARCH ===
${analysis1}

=== ANALYSIS 2: CONCEPT BREAKDOWN ===
${analysis2}

=== ANALYSIS 3: EXAM STRATEGY ===
${analysis3}

ORIGINAL QUESTION: ${question}
${answer ? `ANSWER: ${answer}` : ''}

Create the PERFECT explanation that:
- Is crystal clear for any student
- Covers all theoretical foundations
- Provides practical exam tips
- Includes memory aids
- Shows exactly how to answer in exams
- Highlights high-probability aspects

Use your reasoning capabilities to identify the most important insights from all three analyses.`;
  } else if (type === 'deep') {
    userPrompt = `SYNTHESIZE INTO COMPREHENSIVE DEEP ANALYSIS:

=== ANALYSIS 1: GROUNDING RESEARCH ===
${analysis1}

=== ANALYSIS 2: CONCEPT BREAKDOWN ===
${analysis2}

=== ANALYSIS 3: EXAM STRATEGY ===
${analysis3}

QUESTION: ${question}
${answer ? `ANSWER: ${answer}` : ''}

Create the ULTIMATE deep analysis with:
1. **Complete Understanding**: Everything a student needs to know
2. **Step-by-Step Mastery**: Logical progression to full understanding
3. **Exam Excellence**: Exactly how to score maximum marks
4. **Connected Knowledge**: Related topics and cross-references
5. **Memory Mastery**: Best techniques to remember
6. **Practice Guidance**: How to practice effectively
7. **Key Insights**: Most important takeaways

Reason through all the analyses and identify the golden nuggets of information.`;
  } else if (type === 'summary') {
    userPrompt = `CREATE THE ULTIMATE REVISION SUMMARY:

=== ANALYSIS 1: GROUNDING RESEARCH ===
${analysis1}

=== ANALYSIS 2: CONCEPT BREAKDOWN ===
${analysis2}

=== ANALYSIS 3: EXAM STRATEGY ===
${analysis3}

CONTENT:
${question}

Generate:
1. **Unit-wise Priority Map**: Which units have highest probability
2. **Must-Know List**: Absolutely essential content
3. **Quick Formulas**: All critical formulas in one place
4. **30-Minute Revision**: Last-minute preparation guide
5. **Question Predictions**: Most likely questions
6. **Scoring Hacks**: Tips to maximize marks
7. **Memory Tricks**: Mnemonics for difficult concepts

Synthesize all analyses to create the most effective study material possible.`;
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-reasoner',
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
    const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    
    if (!DEEPSEEK_API_KEY) {
      throw new Error("DEEPSEEK_API_KEY is not configured");
    }
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    console.log(`\n========================================`);
    console.log(`Processing ${type} request with 3-Stage Analysis + DeepSeek R1 Polish`);
    console.log(`========================================\n`);

    // Analysis 1: Gemini Flash - Grounding Search
    const searchQuery = type === 'summary' ? question.slice(0, 500) : question;
    const analysis1 = await analysis1_GroundingSearch(searchQuery, GEMINI_API_KEY);
    
    // Analysis 2: Gemini Pro - Concept Breakdown
    const analysis2 = await analysis2_ConceptBreakdown(question, answer, analysis1, type, GEMINI_API_KEY);

    // Analysis 3: Gemini Pro - Exam Strategy
    const analysis3 = await analysis3_ExamStrategy(question, answer, analysis1, analysis2, type, GEMINI_API_KEY);

    // Final Polish: DeepSeek R1 Reasoning
    const response = await finalPolish_DeepSeekR1(
      question, 
      answer, 
      analysis1,
      analysis2,
      analysis3,
      type, 
      DEEPSEEK_API_KEY
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API error:', response.status, errorText);
      
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
      
      throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
    }

    console.log("All analyses complete. Streaming final response...");

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
