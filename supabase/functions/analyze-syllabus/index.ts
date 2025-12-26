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
    const { imageBase64, imageUrl, department, studyGoal } = await req.json();

    if (!imageBase64 && !imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Image is required (base64 or URL)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API keys
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!PERPLEXITY_API_KEY) {
      console.error('PERPLEXITY_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Perplexity API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'OpenRouter API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Study goal specific instructions
    const goalInstructions = studyGoal === 'pass' 
      ? `STUDY GOAL: JUST PASS (Minimum effort for passing marks)
        - Focus ONLY on high-frequency questions (appeared 3+ times in previous JNTUH exams)
        - Identify the absolute minimum topics needed to pass each unit
        - Skip complex derivations - focus on definitions, diagrams, and direct answers
        - Aim for 2-3 confident answers per unit (enough for 40 marks)
        - Prioritize topics with simple, memorizable content`
      : `STUDY GOAL: HIGH MARKS (Aim for 80%+ marks)
        - Cover ALL important topics comprehensively
        - Include derivations, proofs, and numerical problems
        - Prepare for both Part A (short answers) and Part B (essays)
        - Focus on conceptual understanding for application-based questions
        - Include diagrams, flowcharts, and detailed explanations`;

    // ============================================
    // STAGE 1: Google AI Studio Vision (Gemini)
    // ============================================
    console.log('Stage 1: Analyzing syllabus image with Gemini Vision...');
    
    const visionPrompt = `You are analyzing a JNTUH (Jawaharlal Nehru Technological University, Hyderabad) syllabus image for ${department || 'B.Tech'} department.

TASK: Extract the complete syllabus structure from this image.

For EACH UNIT found, extract:
1. Unit number and title
2. All topics/subtopics listed
3. Key concepts mentioned
4. Any textbook references

Format your response as:
## EXTRACTED SYLLABUS

### UNIT 1: [Title]
Topics:
- Topic 1
- Topic 2
- ...

### UNIT 2: [Title]
Topics:
- ...

(Continue for all units)

---
SUBJECT NAME: [Identify the subject from the syllabus]
TOTAL UNITS: [Number]
REGULATION: [R22/R18 if visible]

Be thorough and extract EVERY topic mentioned in the syllabus image.`;

    // Prepare image for Google AI Studio format
    const imageData = imageBase64 || '';
    
    const visionResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { 
                inlineData: { 
                  mimeType: "image/jpeg", 
                  data: imageData 
                } 
              },
              { text: visionPrompt }
            ]
          }],
          generationConfig: {
            maxOutputTokens: 3000,
          }
        }),
      }
    );

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error('Gemini Vision API error:', visionResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `Vision API error: ${visionResponse.status} - ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const visionData = await visionResponse.json();
    const extractedSyllabus = visionData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (!extractedSyllabus) {
      console.error('No syllabus content extracted from image');
      return new Response(
        JSON.stringify({ error: 'Could not extract syllabus from image' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Stage 1 Complete: Syllabus extracted successfully');

    // Extract subject name from syllabus for web search
    const subjectMatch = extractedSyllabus.match(/SUBJECT NAME:\s*(.+)/i);
    const subjectName = subjectMatch ? subjectMatch[1].trim() : department || 'Engineering Subject';

    // ============================================
    // STAGE 2: Perplexity Web Search
    // ============================================
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
            content: `Find JNTUH previous year question papers, important questions, and exam patterns for:
            
Subject: ${subjectName}
Department: ${department || 'B.Tech'}
Regulation: R22 (preferred) or R18

Focus on:
1. Most frequently asked questions from previous JNTUH exams
2. Important topics that appear repeatedly
3. Question patterns for Part A (short answers) and Part B (essays)
4. Any model papers or predicted questions
5. Weightage of topics across different units

Provide specific questions if available, with their frequency of appearance.`
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
        const errorText = await searchResponse.text();
        console.error('Perplexity search error:', searchResponse.status, errorText);
        webSearchResults = 'Web search unavailable. Proceeding with syllabus analysis only.';
      }
    } catch (searchError) {
      console.error('Perplexity search failed:', searchError);
      webSearchResults = 'Web search failed. Proceeding with syllabus analysis only.';
    }

    // ============================================
    // STAGE 3: DeepSeek R1 Reasoning (Streaming)
    // ============================================
    console.log('Stage 3: Generating study plan with DeepSeek R1 reasoning...');

    const analysisPrompt = `You are a JNTUH exam preparation expert with access to both the syllabus and real question paper data.

${goalInstructions}

---
## EXTRACTED SYLLABUS:
${extractedSyllabus}

---
## WEB SEARCH RESULTS (Previous Papers & Important Questions):
${webSearchResults}

${citations.length > 0 ? `\n## SOURCES:\n${citations.map((c, i) => `${i + 1}. ${c}`).join('\n')}` : ''}

---

TASK: Create a comprehensive, data-driven exam preparation guide using BOTH the syllabus AND the real question paper data from web search.

## 📚 SUBJECT OVERVIEW
- Subject name and department
- Total units identified
- Exam pattern based on previous papers

## 🎯 HIGH PROBABILITY QUESTIONS (PER UNIT)

For each unit, provide:
### UNIT [X]: [Title]

**🔥 Most Likely Questions (Based on Previous Papers):**
1. [Actual question from papers] - [Frequency: appeared X times]
2. [Question] - [Year/source if known]

**📝 Critical Topics (From Web Search Data):**
- Topic 1: [What to focus on based on paper analysis]
- Topic 2: [Key formulas/concepts that repeat]

**⏱️ Estimated Study Time:** [X hours]

## 📋 STUDY ACTION PLAN

Based on "${studyGoal === 'pass' ? 'Just Pass' : 'High Marks'}" goal and REAL paper patterns:

### Priority Order (Based on Frequency):
1. [Most important topic] - [Why]
2. [Second priority] - [Frequency data]

### Week-wise Preparation:
- **Week 1:** [Units + specific focus areas]
- **Week 2:** [Units + specific focus areas]
- **Revision:** [Strategy based on high-frequency topics]

## 💡 EXAM TIPS (Based on Actual JNTUH Patterns)
- Part A strategy (based on typical questions)
- Part B strategy (based on essay patterns)
- Time management

## 📊 CONFIDENCE MATRIX
| Unit | High-Frequency Topics | Question Probability | Study Priority |
|------|----------------------|---------------------|----------------|
| 1    | [Topics]             | High/Medium/Low     | ⭐⭐⭐         |

Be specific with actual questions from the web search results. Use emojis for visual clarity.`;

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
        messages: [{
          role: 'user',
          content: analysisPrompt
        }],
        stream: true,
      }),
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error('DeepSeek R1 API error:', analysisResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `Analysis API error: ${analysisResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Stream the response with all stages
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Stage 1: Send extracted syllabus
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          stage: 'syllabus_extracted', 
          content: extractedSyllabus 
        })}\n\n`));

        // Stage 2: Send web search results
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          stage: 'web_search_complete', 
          content: webSearchResults,
          citations: citations
        })}\n\n`));

        // Stage 3: Stream DeepSeek R1 analysis
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
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                    stage: 'analysis', 
                    content 
                  })}\n\n`));
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
