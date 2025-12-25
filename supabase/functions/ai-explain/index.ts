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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    switch (type) {
      case "explain":
        systemPrompt = `You are a helpful educational assistant. Your task is to explain exam questions in a simple, easy-to-understand way. 
        - Break down complex concepts into simpler parts
        - Use analogies and examples when helpful
        - Keep explanations concise but thorough
        - If an answer is provided, explain why that answer is correct`;
        userPrompt = `Please explain this exam question in simple terms:\n\nQuestion: ${question}${answer ? `\n\nProvided Answer: ${answer}` : ''}`;
        break;
      
      case "deep":
        systemPrompt = `You are an expert educator specializing in deep conceptual understanding. Your task is to:
        - Provide thorough reasoning and analysis
        - Connect concepts to broader topics
        - Explain the underlying principles
        - Address common misconceptions
        - Suggest related topics for further study`;
        userPrompt = `Please provide a deep understanding of this concept:\n\nQuestion: ${question}${answer ? `\n\nProvided Answer: ${answer}` : ''}`;
        break;
      
      case "summary":
        systemPrompt = `You are a revision assistant. Create concise, exam-focused revision summaries that:
        - Highlight key points and formulas
        - Use bullet points for clarity
        - Include memory aids and mnemonics
        - Focus on what's most likely to be tested`;
        userPrompt = `Create a revision summary for these questions:\n\n${question}`;
        break;
      
      default:
        throw new Error("Invalid explanation type");
    }

    console.log(`Processing ${type} request for question`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add more credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Error in ai-explain function:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
