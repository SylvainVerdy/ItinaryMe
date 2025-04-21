import { NextResponse } from 'next/server';

const SERPAPI_KEY = process.env.NEXT_PUBLIC_SERPAPI_API_KEY || process.env.SERPAPI_API_KEY || '';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { endpoint, params } = body;
    
    // Ajouter la clé API
    const apiParams = {
      ...params,
      api_key: SERPAPI_KEY
    };
    
    const queryString = new URLSearchParams();
    
    // Convertir les paramètres en chaînes
    for (const [key, value] of Object.entries(apiParams)) {
      if (value !== undefined) {
        queryString.append(key, String(value));
      }
    }
    
    const url = `https://serpapi.com/${endpoint || 'search'}?${queryString.toString()}`;
    console.log("Appel API SerpAPI:", url.replace(SERPAPI_KEY, "API_KEY_HIDDEN"));
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erreur SerpAPI:", response.status, errorText);
      return NextResponse.json({ error: `SerpAPI error: ${response.status}` }, { status: 500 });
    }
    
    const data = await response.json();
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Erreur API SerpAPI:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
