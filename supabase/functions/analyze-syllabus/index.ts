import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-id',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { stage, imageBase64, imageUrl, metadata, subject, department, unit, fullSyllabus, searchContext, maxTokens, strategy } = await req.json();

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

    if (!OPENROUTER_API_KEY) throw new Error('Missing OPENROUTER_API_KEY');

    // === STAGE 1: VISION ===
    if (stage === 'vision') {
      if (!imageBase64 && !imageUrl) throw new Error('Image required for vision stage');

      console.log('Executing Stage 1: Vision (Qwen 2.5 VL)...');

      const visionPrompt = `
You are the "Syllabus Architect". extract the syllabus structure from this image into a strict JSON format.
Detect ALL units/modules present (whether 4, 5, or 6).

Output JSON Schema:
{
  "subject_name": string,
  "subject_code": string | null,
  "regulation": string | null,
  "semester": number | null,
  "total_units": number,
  "units": [
    {
      "unit_number": number,
      "title": string,
      "topics": string[], // List of topics
      "keywords": string[]
    }
  ]
}

- Capture EVERY unit found in the image.
- "topics" must include ALL extracted text for that unit.
`;

      const visionResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://examaid-pro.vercel.app',
          'X-Title': 'JNTUH Exam Prep',
        },
        body: JSON.stringify({
          model: 'qwen/qwen-2.5-vl-7b-instruct',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: visionPrompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}` // Assume base64 is passed, handling URL TODO if needed
                  }
                }
              ]
            }
          ],
          response_format: { type: 'json_object' }
        }),
      });

      if (!visionResponse.ok) {
        const err = await visionResponse.text();
        throw new Error(`Vision API failed: ${err}`);
      }

      const visionData = await visionResponse.json();
      const content = visionData.choices?.[0]?.message?.content || '{}';
      return new Response(content, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // === STAGE 2: SEARCH ===
    if (stage === 'search') {
      if (!PERPLEXITY_API_KEY) throw new Error('Missing PERPLEXITY_API_KEY');
      const querySubject = subject || 'JNTUH Subject';
      console.log(`Executing Stage 2: Search for ${querySubject}...`);

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
            content: `Find JNTUH previous year question papers and important topics for "${querySubject}" (${department || 'B.Tech'}).
Focus on years 2019-2024. Identify recurring questions, Part A vs Part B patterns, and high-frequency topics.
Format as a structured summary.`
          }],
          search_recency_filter: 'year',
        }),
      });

      if (!searchResponse.ok) {
        // Fallback if search fails
        console.warn('Search failed, returning empty context');
        return new Response(JSON.stringify({ searchResults: '' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const searchData = await searchResponse.json();
      const searchResults = searchData.choices?.[0]?.message?.content || '';
      // TODO: We could add CITATIONS here too
      return new Response(JSON.stringify({ searchResults }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // === STAGE 3: ANALYSIS (Unit-Level) ===
    if (stage === 'analysis' || stage === 'full') { // 'full' kept for fallback compat
      if (!unit || !fullSyllabus) throw new Error('Unit and Full Syllabus required for analysis');
      console.log(`Executing Stage 3: Analysis for Unit ${unit.unit_number}...`);

      const context = `
SUBJECT: ${fullSyllabus.subject_name} (${fullSyllabus.regulation})
UNIT: ${unit.unit_number} - ${unit.title}
TOPICS: ${unit.topics.join(', ')}
SEARCH CONTEXT: ${searchContext || 'No external context available.'}

User Strategy: ${strategy || 'single'}
Max Tokens: ${maxTokens || 4000}
`;

      const analysisPrompt = `
You are the "Examaid Unit Analyzer". Analyze this unit for JNTUH exams.
Context:
${context}

Task:
1. Generate Part A Questions (2 marks) - High probability.
2. Generate Part B Questions (10 marks) - Essay type with internal choice.
3. Identify Key Topics based on frequency.
4. Suggest a mini-study plan for this unit.

Output JSON only:
{
  "unit_number": number,
  "part_a": [{ "question": string, "answer": string, "marks": 2, "bt_level": string, "co": string }],
  "part_b": [{ "question": string, "answer": string, "marks": 10, "bt_level": string, "co": string }], // Just list important essay questions
  "keywords": [{ "topic": string, "frequency": "High"|"Medium" }],
  "study_plan": { "focus_areas": string[], "estimated_hours": number }
}
`;

      const analysisResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://examaid-pro.vercel.app',
          'X-Title': 'JNTUH Exam Prep',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001', // Fast and good context
          messages: [
            { role: 'system', content: 'You are an expert exam analyzer. Output strict JSON.' },
            { role: 'user', content: analysisPrompt }
          ],
          response_format: { type: 'json_object' }
        }),
      });

      if (!analysisResponse.ok) throw new Error('Analysis API failed');

      const analysisData = await analysisResponse.json();
      const content = analysisData.choices?.[0]?.message?.content || '{}';
      return new Response(content, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    throw new Error(`Unknown stage: ${stage}`);

  } catch (error) {
    console.error('Edge Function Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
