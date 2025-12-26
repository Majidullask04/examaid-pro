import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-id',
};

serve(async (req) => {
  // Handle CORS preflight requests
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

    const OPENROUTER_GEMINI_KEY = Deno.env.get('OPENROUTER_GEMINI_KEY');
    if (!OPENROUTER_GEMINI_KEY) {
      console.error('OPENROUTER_GEMINI_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare image content for vision API
    const imageContent = imageBase64 
      ? { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
      : { type: 'image_url', image_url: { url: imageUrl } };

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

    // Stage 1: Vision Analysis - Extract syllabus structure
    console.log('Stage 1: Analyzing syllabus image...');
    
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

    const visionResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_GEMINI_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://jntuh-exam-prep.lovable.app',
        'X-Title': 'JNTUH Exam Prep',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-preview',
        messages: [{
          role: 'user',
          content: [
            imageContent,
            { type: 'text', text: visionPrompt }
          ]
        }],
        max_tokens: 2500, // Reduced to stay within credit limits
      }),
    });

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error('Vision API error:', visionResponse.status, errorText);
      
      if (visionResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'OpenRouter credits insufficient. Please add credits at https://openrouter.ai/settings/credits' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `Vision API error: ${visionResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const visionData = await visionResponse.json();
    const extractedSyllabus = visionData.choices?.[0]?.message?.content || '';
    console.log('Syllabus extracted successfully');

    // Stage 2: Web Search for Model Papers + Analysis
    console.log('Stage 2: Searching for model papers and generating study plan...');

    const analysisPrompt = `You are a JNTUH exam preparation expert. Based on the extracted syllabus below, create a comprehensive exam preparation guide.

${goalInstructions}

---
EXTRACTED SYLLABUS:
${extractedSyllabus}
---

TASK: Create a detailed exam preparation guide with the following structure:

## 📚 SUBJECT OVERVIEW
- Subject name and department
- Total units identified
- Exam pattern (if known for JNTUH R22)

## 🎯 HIGH PROBABILITY QUESTIONS (PER UNIT)

For each unit, provide:
### UNIT [X]: [Title]

**🔥 Most Likely Questions (80%+ probability):**
1. [Question] - [Why it's important]
2. [Question] - [Frequency in previous papers]

**📝 Important Topics:**
- Topic 1: [Brief explanation of what to study]
- Topic 2: [Key points to remember]

**⏱️ Estimated Study Time:** [X hours]

## 📋 STUDY ACTION PLAN

Based on "${studyGoal === 'pass' ? 'Just Pass' : 'High Marks'}" goal:

### Week-wise Preparation:
- **Week 1:** [Units to cover]
- **Week 2:** [Units to cover]
- **Revision:** [Strategy]

### Daily Schedule Template:
- Morning: [What to study]
- Evening: [What to practice]

## 💡 EXAM TIPS
- Part A strategy (short answers)
- Part B strategy (essay questions)
- Time management during exam

## 📊 CONFIDENCE MATRIX
| Unit | Topic Coverage | Question Probability | Study Priority |
|------|---------------|---------------------|----------------|
| 1    | X%            | High/Medium/Low     | ⭐⭐⭐         |

Be specific, practical, and focused on exam success. Use emojis for visual clarity.`;

    const analysisResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_GEMINI_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://jntuh-exam-prep.lovable.app',
        'X-Title': 'JNTUH Exam Prep',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-preview',
        messages: [{
          role: 'user',
          content: analysisPrompt
        }],
        stream: true,
        max_tokens: 4000, // Reduced from 8000
        reasoning: { enabled: true },
      }),
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error('Analysis API error:', analysisResponse.status, errorText);
      
      if (analysisResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'OpenRouter credits insufficient. Please add credits at https://openrouter.ai/settings/credits' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `Analysis API error: ${analysisResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Stream the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // First, send the extracted syllabus as a stage update
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          stage: 'syllabus_extracted', 
          content: extractedSyllabus 
        })}\n\n`));

        // Then stream the analysis
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
