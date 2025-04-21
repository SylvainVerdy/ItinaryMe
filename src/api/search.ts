import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }
    
    const SERP_API_KEY = process.env.SERP_API_KEY;
    
    if (!SERP_API_KEY) {
      return NextResponse.json({ error: 'SERP API key not configured' }, { status: 500 });
    }
    
    // URL encode the query
    const encodedQuery = encodeURIComponent(query);
    
    // Construire l'URL de l'API SERP
    const url = `https://serpapi.com/search?q=${encodedQuery}&hl=fr&gl=fr&api_key=${SERP_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`SERP API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extraire et formater les résultats de la recherche
    return NextResponse.json({
      results: data.organic_results || [],
      knowledge_panel: data.knowledge_graph || null,
      answer_box: data.answer_box || null
    });
  } catch (error) {
    console.error('Error in search API:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
