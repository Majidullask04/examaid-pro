import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const openRouterHeaders = (apiKey: string) => ({
  'Authorization': `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
  'HTTP-Referer': 'https://examaid-pro.vercel.app',
  'X-Title': 'JNTUH Exam Prep',
});

// Stage 1: Initial research and context gathering
async function stage1_Research(query: string, apiKey: string): Promise<string> {
  console.log("=== STAGE 1: Research & Context ===");

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: openRouterHeaders(apiKey),
      body: JSON.stringify({
        model: 'deepseek/deepseek-r1-0528:free',
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
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: openRouterHeaders(apiKey),
      body: JSON.stringify({
        model: 'deepseek/deepseek-r1-0528:free',
        messages: [
          {
            role: 'system',
            content: 'You are a senior JNTUH professor with 20+ years experience. Provide thorough, exam-focused analysis with hit ratios and confidence levels.'
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

  const systemPrompt = `You are an elite educational AI for JNTUH R22 exam preparation.
You must provide a clean, well-structured analysis using proper markdown formatting.
Do NOT use special characters like asterisks for decoration. Use proper markdown headers, tables, and lists.
Focus on high-probability content and exam patterns.`;

  const structuredOutputFormat = `
## Subject Analysis

### Methodology
[Brief methodology description]

---

## Top Recurring Topics & Hit Ratio

| # | Topic | Years Appeared | Hit Ratio | Confidence |
|---|-------|----------------|-----------|------------|
| 1 | [Topic Name] | 2019, 2021, 2023 | 75% | High |
| 2 | [Topic Name] | 2020, 2022 | 50% | Medium |
(Add more rows as needed)

---

## Unit-wise Important Questions

### UNIT 1: [Unit Title]

| Question | Hit Ratio | Confidence | Years |
|----------|-----------|------------|-------|
| [Question text] | 80% | High | 2019, 2022, 2023 |
| [Question text] | 60% | Medium | 2020, 2021 |

### UNIT 2: [Unit Title]
(Similar table format)

### UNIT 3: [Unit Title]
(Similar table format)

### UNIT 4: [Unit Title]
(Similar table format)

### UNIT 5: [Unit Title]
(Similar table format)

---

## Action Plan For You

### If you have 1 DAY before exam:
- Focus on these top 5 questions: [list]
- Memorize these formulas: [list]
- Skip these low-priority topics: [list]

### If you have 1 WEEK before exam:
- Day 1-2: Cover Unit 1 & 2 focusing on [topics]
- Day 3-4: Cover Unit 3 & 4 focusing on [topics]
- Day 5-6: Practice previous questions + weak areas
- Day 7: Quick revision + formula review

### If you have 1 MONTH before exam:
- Week 1: Complete Unit 1-2 with thorough practice
- Week 2: Complete Unit 3-4 with thorough practice
- Week 3: Unit 5 + Mock tests + weak area focus
- Week 4: Full revision + previous papers + formula sheets

---

## My Recommendation

Based on this analysis:
- **Start with**: [Most critical topic to begin]
- **Must not miss**: [Absolutely essential concept]
- **Common mistake to avoid**: [Warning about typical errors]
- **Pro tip for maximum marks**: [Exam scoring strategy]
`;

  let userPrompt = '';

  if (type === 'deep') {
    userPrompt = `CREATE COMPREHENSIVE EXAM ANALYSIS:

=== RESEARCH DATA ===
${stage1}

=== DETAILED ANALYSIS ===
${stage2}

SUBJECT/TOPIC: ${question}

Generate a complete analysis following this EXACT structure:
${structuredOutputFormat}

Important:
- Use clean markdown with proper headers (##, ###)
- Create proper tables with | separators
- Include realistic hit ratios (percentage) based on pattern analysis
- Confidence levels: High (>70%), Medium (40-70%), Low (<40%)
- Provide specific, actionable study plans for different time scenarios
- Make recommendations practical and specific to the subject`;
  } else if (type === 'explain') {
    userPrompt = `CREATE CLEAR EXPLANATION:

=== RESEARCH ===
${stage1}

=== ANALYSIS ===
${stage2}

QUESTION: ${question}
${answer ? `ANSWER: ${answer}` : ''}

Provide a clear, well-formatted explanation with:
1. Simple concept breakdown
2. Key points to remember
3. How to answer in exam
4. Related questions to practice

Use clean markdown formatting.`;
  } else {
    userPrompt = `CREATE REVISION SUMMARY:

=== RESEARCH ===
${stage1}

=== ANALYSIS ===
${stage2}

CONTENT: ${question}

Generate a concise revision guide with proper formatting.
Include quick revision points, formulas, and exam tips.`;
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: openRouterHeaders(apiKey),
    body: JSON.stringify({
      model: 'deepseek/deepseek-r1-0528:free',
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
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    console.log(`\n========================================`);
    console.log(`Processing ${type} request with 3-Stage Analysis`);
    console.log(`Query: ${question.substring(0, 100)}...`);
    console.log(`========================================\n`);

    // Stage 1: Research
    const searchQuery = type === 'summary' ? question.slice(0, 500) : question;
    const stage1 = await stage1_Research(searchQuery, OPENROUTER_API_KEY);

    // Stage 2: Analysis
    const stage2 = await stage2_Analysis(question, answer, stage1, type, OPENROUTER_API_KEY);

    // Stage 3: Final Synthesis with streaming
    const response = await stage3_Synthesis(
      question,
      answer,
      stage1,
      stage2,
      type,
      OPENROUTER_API_KEY
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);

      if (response.status === 401) {
        return new Response(JSON.stringify({ error: "OpenRouter authentication failed. Please verify your API key." }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
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
