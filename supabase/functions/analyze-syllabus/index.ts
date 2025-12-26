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

    const analysisPrompt = `You are a JNTUH exam pattern analyst. Analyze the syllabus and web search data to create a data-driven study guide.

${goalInstructions}

EXTRACTED SYLLABUS:
${extractedSyllabus}

WEB SEARCH RESULTS (Previous Papers Data):
${webSearchResults}

${citations.length > 0 ? `SOURCES: ${citations.slice(0, 5).join(', ')}` : ''}

Create this EXACT structure:

## QUESTION PATTERN ANALYSIS METHODOLOGY

Data Collection:
- Papers analyzed: 2019-2024
- Total questions reviewed: [estimate from web data]
- Sources: [list citations]

Analysis Process:
1. Extracted topics from syllabus
2. Matched with JNTUH question bank (2019-2024)
3. Calculated frequency and probability

---

## YEAR-WISE HIT RATIO ANALYSIS

| Topic | 2024 | 2023 | 2022 | 2021 | 2020 | Hits | Confidence |
|-------|------|------|------|------|------|------|------------|
| [Topic] | Y/N | Y/N | Y/N | Y/N | Y/N | X/5 | XX% |

(Include 10-15 most important topics)

---

## HIGH PROBABILITY QUESTIONS PER UNIT

### UNIT 1: [Title]
| # | Question | Confidence | Years |
|---|----------|------------|-------|
| 1 | [Question from papers] | 90% | 2024, 2023, 2022 |
| 2 | [Question] | 75% | 2023, 2022 |
| 3 | [Question] | 60% | 2024 |

(Repeat for ALL units - minimum 3 questions per unit with confidence %)

---

## SUGGESTED APPROACH TO TACKLE THIS SUBJECT

### Phase 1: Foundation (Days 1-3)
- Start with [90%+ confidence topics]
- Focus: [specific topics]

### Phase 2: Core (Days 4-7)
- Cover [60-80% confidence topics]
- Practice: [specific types]

### Phase 3: Revision (Days 8-10)
- Quick review of high-frequency topics
- Mock tests strategy

### Exam Strategy:
- Part A: [tips based on patterns]
- Part B: [tips based on patterns]
- Time: [allocation]

Use actual questions from web search. Confidence % = (years appeared / 5) * 100.`;

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
        // Stage 1: Cleaned syllabus
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          stage: 'syllabus_extracted', 
          content: extractedSyllabus 
        })}\n\n`));

        // Stage 2: Web search with year data
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          stage: 'web_search_complete', 
          content: webSearchResults,
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
