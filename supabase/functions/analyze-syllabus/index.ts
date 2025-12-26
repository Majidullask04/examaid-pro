import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-id',
};

// Clean extracted text - remove extra special characters and think tags
function cleanText(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '') // Remove DeepSeek think tags
    .replace(/[*#@~`|\\^]+/g, '')
    .replace(/\s{3,}/g, '\n\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, imageUrl, department, studyGoal } = await req.json();

    if (!imageBase64 && !imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Image is required (base64 or URL)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

    if (!GEMINI_API_KEY || !PERPLEXITY_API_KEY || !OPENROUTER_API_KEY) {
      console.error('Missing API keys');
      return new Response(
        JSON.stringify({ error: 'API keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const goalInstructions = studyGoal === 'pass' 
      ? `STUDY GOAL: JUST PASS - Focus on minimum effort for passing. Only high-frequency questions (appeared 3+ times). Skip derivations, focus on definitions and diagrams.`
      : `STUDY GOAL: HIGH MARKS (80%+) - Cover ALL topics comprehensively. Include derivations, numericals, and conceptual understanding.`;

    // STAGE 1: Gemini Vision
    console.log('Stage 1: Analyzing syllabus image with Gemini Vision...');
    
    const visionPrompt = `Extract the complete syllabus from this JNTUH ${department || 'B.Tech'} image.

For EACH UNIT:
- Unit number and title
- All topics listed
- Key concepts

Format:
UNIT 1: [Title]
- Topic 1
- Topic 2

UNIT 2: [Title]
- Topic 1
...

SUBJECT NAME: [Name]
TOTAL UNITS: [Number]`;

    const visionResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType: "image/jpeg", data: imageBase64 || '' } },
              { text: visionPrompt }
            ]
          }],
          generationConfig: { maxOutputTokens: 3000 }
        }),
      }
    );

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error('Gemini Vision error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Vision API error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const visionData = await visionResponse.json();
    const rawSyllabus = visionData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const extractedSyllabus = cleanText(rawSyllabus);
    
    if (!extractedSyllabus) {
      return new Response(
        JSON.stringify({ error: 'Could not extract syllabus from image' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Stage 1 Complete: Syllabus extracted successfully');

    const subjectMatch = extractedSyllabus.match(/SUBJECT NAME:\s*(.+)/i);
    const subjectName = subjectMatch ? subjectMatch[1].trim() : 'Engineering Subject';

    // STAGE 2: Perplexity Web Search - Year-wise Pattern Analysis
    console.log('Stage 2: Searching for JNTUH previous papers with Perplexity...');

    let webSearchResults = '';
    let citations: string[] = [];

    try {
      const searchResponse = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [{
            role: 'user',
            content: `Find JNTUH previous year question papers for "${subjectName}" (${department}):

1. Search questions from years 2019, 2020, 2021, 2022, 2023, 2024
2. For EACH question/topic, note which years it appeared
3. Find frequency: how many times each topic appeared across years
4. Find R22 and R18 regulation papers
5. Part A vs Part B patterns

Format:
TOPIC/QUESTION | YEARS APPEARED | FREQUENCY
Example: "Normalization" | 2024, 2023, 2022 | 3 times

Include actual questions with year data.`
          }],
          search_recency_filter: 'year',
        }),
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        webSearchResults = searchData.choices?.[0]?.message?.content || '';
        citations = searchData.citations || [];
        console.log('Stage 2 Complete: Web search successful with', citations.length, 'citations');
      } else {
        webSearchResults = 'Web search unavailable.';
      }
    } catch (searchError) {
      console.error('Perplexity search failed:', searchError);
      webSearchResults = 'Web search failed.';
    }

    // STAGE 3: DeepSeek R1 - Pattern Analysis & Confidence Levels
    console.log('Stage 3: Generating study plan with DeepSeek R1 reasoning...');

    const analysisPrompt = `You are a JNTUH exam pattern analyst. Create a comprehensive exam guide using the syllabus and previous paper data.

${goalInstructions}

EXTRACTED SYLLABUS (Internal Use Only - DO NOT display this to user):
${extractedSyllabus}

WEB SEARCH RESULTS (Previous Papers 2019-2024):
${webSearchResults}

${citations.length > 0 ? `SOURCES: ${citations.slice(0, 5).join(', ')}` : ''}

IMPORTANT: Generate output in this EXACT structure. Use ★ for years appeared, calculate confidence as (hits/6)*100%:

---

## 🔬 METHODOLOGY: QUESTION PATTERN ANALYSIS

### Data Collection:
- **Papers Analyzed:** JNTUH 2019, 2020, 2021, 2022, 2023, 2024 (6 years)
- **Regulations:** R22, R18
- **Total Questions Reviewed:** [Estimate from web search data]
- **Sources:** ${citations.length > 0 ? citations.slice(0, 3).join(', ') : '[JNTUH official papers]'}

### Analysis Process:
1. Extracted subject topics from syllabus image using AI vision
2. Searched JNTUH previous year question papers (2019-2024)
3. Mapped each question to topics and calculated frequency
4. Confidence Level = (Years Appeared / 6) × 100%

---

## 📊 YEAR-WISE HIT RATIO WITH CONFIDENCE

| Topic | '24 | '23 | '22 | '21 | '20 | '19 | Hit Ratio | Confidence |
|-------|-----|-----|-----|-----|-----|-----|-----------|------------|
| [Topic 1] | ★ | ★ | ★ | - | ★ | ★ | 5/6 | 83% 🔥 |
| [Topic 2] | ★ | ★ | - | ★ | - | ★ | 4/6 | 67% ⭐⭐⭐ |
| [Topic 3] | ★ | ★ | ★ | ★ | ★ | ★ | 6/6 | 100% 🔥🔥 |
| [Topic 4] | - | ★ | ★ | - | - | - | 2/6 | 33% ⭐⭐ |

**Legend:**
- ★ = Question appeared that year | - = Not appeared
- 🔥🔥 = GUARANTEED (100%) | 🔥 = Very High (75-99%) | ⭐⭐⭐ = High (50-74%) | ⭐⭐ = Medium (25-49%) | ⭐ = Low (<25%)

(Include 15-20 most important topics from syllabus with actual hit data)

---

## 🎯 HIGH PROBABILITY QUESTIONS PER UNIT

### UNIT 1: [Title from syllabus]

| # | Question | Years Appeared | Hits | Confidence |
|---|----------|----------------|------|------------|
| 1 | [Actual question from papers] | 2024 ★, 2023 ★, 2022 ★, 2021 ★, 2019 ★ | 5/6 | 83% 🔥 |
| 2 | [Question text] | 2024 ★, 2023 ★, 2022 ★ | 3/6 | 50% ⭐⭐⭐ |
| 3 | [Question text] | 2023 ★, 2021 ★ | 2/6 | 33% ⭐⭐ |

### UNIT 2: [Title]
(Same format - 4-5 questions per unit with confidence levels)

### UNIT 3: [Title]
(Continue for ALL units in the syllabus)

### UNIT 4: [Title]
(Continue...)

### UNIT 5: [Title]
(Continue...)

---

## 💡 SUGGESTED APPROACH TO TACKLE THIS SUBJECT

### 📚 Phase 1: High Priority Topics (Days 1-4) - 75%+ Confidence
**Focus on 🔥 and 🔥🔥 rated topics first:**
- [List specific topics with 75%+ confidence]
- Time allocation: 40% of total study time
- Strategy: [Specific study tips for these topics]

### 📖 Phase 2: Core Topics (Days 5-8) - 50-74% Confidence  
**Cover ⭐⭐⭐ rated topics:**
- [List specific topics]
- Time allocation: 35% of total study time
- Practice: [Specific practice methods]

### 📝 Phase 3: Supporting Topics (Days 9-10) - 25-49% Confidence
**Brief review of ⭐⭐ rated topics:**
- [List topics]
- Time allocation: 15% of total study time
- Focus on: Key definitions and diagrams only

### 🎯 Phase 4: Final Revision (Days 11-12)
- Revise all 🔥 topics thoroughly
- Quick formula/diagram review
- Practice previous year papers

### 📋 Exam Day Strategy:
**Part A (Short Answers - 2 marks each):**
- [Tips based on pattern analysis]
- Common question types: [List]

**Part B (Long Answers - 10-14 marks each):**
- [Tips based on pattern analysis]
- Focus areas: [List high-probability topics]

**Time Management:**
- Part A: [Time allocation]
- Part B: [Time allocation]
- Review: [Time allocation]

### ⚡ Quick Tips:
1. [Specific tip based on subject pattern]
2. [Another tip]
3. [Another tip]

---

*Analysis based on JNTUH papers (2019-2024). Confidence levels are calculated from historical patterns and may vary.*`;

    const analysisResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://jntuh-exam-prep.lovable.app',
        'X-Title': 'JNTUH Exam Prep',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-r1-0528:free',
        messages: [{ role: 'user', content: analysisPrompt }],
        stream: true,
      }),
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error('DeepSeek R1 API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Analysis API error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Skip syllabus_extracted stage - only send web_search_complete
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          stage: 'web_search_complete', 
          content: `Found ${citations.length} sources for previous papers`,
          citations: citations
        })}\n\n`));

        // Stage 3: Stream analysis
        const reader = analysisResponse.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
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
              if (data === '[DONE]') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                let content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  // Clean any think tags from streaming content
                  content = content.replace(/<think>[\s\S]*?<\/think>/gi, '');
                  content = content.replace(/<\/?think>/gi, '');
                  if (content.trim()) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                      stage: 'analysis', 
                      content 
                    })}\n\n`));
                  }
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }

        controller.close();
      }
    });

    return new Response(stream, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Error in analyze-syllabus:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
