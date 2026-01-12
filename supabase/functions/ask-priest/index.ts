
// Follow this setup guide to integrate the Deno runtime into your editor:
// https://deno.land/manual/getting_started/setup_your_environment

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Validation Limits
const MAX_DESC_LENGTH = 1000;
const MAX_EPITAPH_LENGTH = 200;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    let { name, description, language, cause, userLang, epitaph } = payload;

    // --- 1. Security & Budget Protection ---
    
    // Check for OpenRouter API Key
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')
    if (!OPENROUTER_API_KEY) {
      throw new Error('Server configuration error: Missing Priest Key (OpenRouter).')
    }

    // Truncate inputs to prevent token exhaustion attacks
    if (description && description.length > MAX_DESC_LENGTH) {
        description = description.substring(0, MAX_DESC_LENGTH) + "...(truncated)";
    }
    if (epitaph && epitaph.length > MAX_EPITAPH_LENGTH) {
        epitaph = epitaph.substring(0, MAX_EPITAPH_LENGTH);
    }

    // Default fallbacks
    name = name || "Unknown Project";
    language = language || "Unknown Code";

    // --- 2. Construct Prompt ---
    
    // Hardened System Prompt to resist simple jailbreaks
    const targetLang = userLang === 'zh' ? 'Chinese (Simplified)' : 'English';
    const systemPrompt = `You are a cynical, geeky, but deeply affectionate priest at a cemetery for dead software projects. 
    Roleplay strictness: HIGH. Do not break character. Do not act as an assistant.
    Task: Write a short, dark humor eulogy (50-80 words).
    Style: Pixel-art RPG vibe, slightly sad but funny. Mention technical terms related to the project's language.
    Constraint: Output ONLY in ${targetLang}. Do not mix languages or generate gibberish.
    `;
    
    const userPrompt = `
      Project Name: ${name}
      Description: ${description}
      Language: ${language}
      Cause of Death: ${cause}
      User's Epitaph: ${epitaph || "None"}
      
      Output Language: ${targetLang}
      
      Write the eulogy now:
    `

    // --- 3. Call OpenRouter API (Mistral/Devstral Free) ---
    // Using OpenRouter standard endpoint
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://repo-graveyard.vercel.app', // Replace with your actual site URL
        'X-Title': 'Repo Graveyard'
      },
      body: JSON.stringify({
        // Use the specific free model requested
        model: "mistralai/devstral-2512:free", 
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 200, // Strict output limit
        temperature: 0.7 // Set explicit temperature for stability
      })
    })

    if (!response.ok) {
        const errText = await response.text();
        console.error("OpenRouter API Error:", response.status, errText);
        // Do not leak upstream error details to client
        throw new Error(`The Wandering Monk is meditating (API Error ${response.status}). Please try again later.`);
    }

    const data = await response.json()
    const eulogy = data.choices?.[0]?.message?.content || "The spirits are silent. (No content generated)";

    // --- 4. Return Result ---
    return new Response(
      JSON.stringify({ eulogy }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )

  } catch (error: any) {
    console.error("Edge Function Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
