import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResourceResult {
  videos: Array<{
    title: string;
    url: string;
    source: string;
    description?: string;
  }>;
  articles: Array<{
    title: string;
    url: string;
    source: string;
    description?: string;
  }>;
  learningPath: string;
  citations: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, context } = await req.json();

    if (!topic) {
      return new Response(
        JSON.stringify({ error: 'Topic is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Search service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Searching for learning resources:', topic);

    // Generate YouTube search URLs directly (more reliable than asking AI for specific video URLs)
    const videoKeywords = [
      `${topic} tutorial`,
      `${topic} JNTUH`,
      `${topic} Gate Smashers`,
      `${topic} Neso Academy`,
      `${topic} explained`,
    ];

    // Create video resources with YouTube search URLs
    const videos: ResourceResult['videos'] = videoKeywords.map((keyword, index) => ({
      title: `Search: ${keyword}`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}`,
      source: 'YouTube Search',
      description: `Find ${topic} videos on YouTube with this search`,
    }));

    console.log('Generated YouTube search URLs for:', topic);

    const articleSearchPrompt = `Find 5 high-quality tutorial articles for learning "${topic}" for engineering students.
    Recommend well-known educational sites like GeeksforGeeks, TutorialsPoint, JavaTPoint, or similar.
    For each article, provide:
    - Article title
    - Full URL
    - Website source
    - Brief description
    ${context ? `Additional context: ${context}` : ''}
    
    IMPORTANT: Return ONLY valid JSON with an 'articles' array. Do not include reasoning or markdown formatting outside the JSON.`;

    // Only fetch articles from OpenRouter
    const articleResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://examaid-pro.vercel.app',
        'X-Title': 'JNTUH Exam Prep',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-r1-0528:free',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that recommends educational resources. You must return a valid JSON object with an "articles" array containing objects with "title", "url", "source", and "description" fields. Ensure URLs are from reputable sources.'
          },
          { role: 'user', content: articleSearchPrompt }
        ],
      }),
    });

    if (!articleResponse.ok) {
      const articleError = await articleResponse.text();
      console.error('OpenRouter API error:', articleError);

      if (articleResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Search rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to search for resources' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const articleData = await articleResponse.json();
    console.log('Article search response received');

    // Parse the responses
    const articleContent = articleData.choices?.[0]?.message?.content || '';
    const articleCitations = articleData.citations || [];

    // Parse article content
    let articles: ResourceResult['articles'] = [];

    try {
      const articleJsonMatch = articleContent.match(/\{[\s\S]*"articles"[\s\S]*\}/);
      if (articleJsonMatch) {
        const parsed = JSON.parse(articleJsonMatch[0]);
        articles = parsed.articles || [];
      }
    } catch {
      // Fallback: extract from citations
      articles = articleCitations.slice(0, 5).map((url: string, i: number) => ({
        title: `Article Resource ${i + 1}`,
        url,
        source: new URL(url).hostname.replace('www.', ''),
        description: 'Educational article resource'
      }));
    }

    // If still no articles, parse from text content
    if (articles.length === 0 && articleContent) {
      const urlMatches = articleContent.match(/https?:\/\/(?:www\.)?(geeksforgeeks|tutorialspoint|javatpoint|programiz|w3schools|medium)[^\s)\]]+/g);
      if (urlMatches) {
        articles = urlMatches.slice(0, 5).map((url: string, i: number) => ({
          title: `Article ${i + 1}`,
          url: url.replace(/[)\]]$/, ''),
          source: new URL(url.replace(/[)\]]$/, '')).hostname.replace('www.', ''),
          description: 'Tutorial article'
        }));
      }
    }

    // Generate learning path
    const learningPath = `## 💡 Recommended Learning Path for ${topic}

1. **Start with Basics**: Watch the first video to understand core concepts
2. **Read Articles**: Go through the articles for in-depth explanations and code examples
3. **Practice**: Try the examples from tutorials on your own
4. **Deep Dive**: Watch remaining videos for advanced topics
5. **Revision**: Use articles as quick reference before exams`;

    const result: ResourceResult = {
      videos,
      articles,
      learningPath,
      citations: articleCitations,
    };

    console.log('Returning resources:', { videoCount: videos.length, articleCount: articles.length });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in find-resources function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
