

import { GoogleGenAI } from "@google/genai";
import { DeathCause, LLMSettings } from "../types";
import { supabase, SUPABASE_ANON_KEY } from "./supabaseClient";

// Unified Prompt Generator (Still used for Client-side calls)
const createPrompt = (
  name: string,
  description: string,
  language: string,
  cause: DeathCause,
  userLang: 'en' | 'zh',
  epitaph?: string
) => {
    return `You are a cynical, geeky, but deeply affectionate priest at a cemetery for dead software projects. 
    Write a short (50-80 words) dark humor eulogy for this project.
    
    Output Language: ${userLang === 'zh' ? 'Chinese (Simplified)' : 'English'}
    Project Name: ${name}
    Description: ${description}
    Language: ${language}
    Cause of Death: ${cause}
    User provided Epitaph: ${epitaph || "None"}

    Style: Pixel-art RPG vibe, slightly sad but funny. Mention technical terms related to the language.
    `;
};

// --- CLIENT SIDE HANDLERS ---

const callGemini = async (prompt: string, apiKey: string) => {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-lite-preview-02-05',
      contents: prompt,
      config: {
        temperature: 0.7, // Set explicit temperature for stability
      }
    });
    return response.text;
}

const callOpenAICompatible = async (
    prompt: string, 
    apiKey: string, 
    baseUrl: string, 
    model: string
) => {
    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: "system", content: "You are a dark humor RPG priest. Output only in the requested language." },
                { role: "user", content: prompt }
            ],
            max_tokens: 150,
            temperature: 0.7 // Reduced from 0.8 for consistency
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "LLM API Call Failed");
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
}

// --- SERVER SIDE HANDLER (SUPABASE EDGE FUNCTION) ---
const callSupabasePriest = async (
    payload: {
        name: string,
        description: string,
        language: string,
        cause: DeathCause,
        userLang: 'en' | 'zh',
        epitaph?: string
    }
) => {
    // This calls the 'ask-priest' Edge Function
    // FIX: We explicitly override the Authorization header with the ANON KEY.
    // By default, supabase.functions.invoke sends the USER'S token if they are logged in.
    // However, for this specific public function, we want to ensure it passes the same way 
    // the 'curl' command does, avoiding 401 errors if the user token isn't handled by the Edge Function.
    
    console.log("Invoking Edge Function: ask-priest (Forced Anon Auth)");
    
    const { data, error } = await supabase.functions.invoke('ask-priest', {
        body: payload,
        headers: {
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        }
    });

    if (error) {
        console.error("Supabase Function Invocation Error:", error);
        throw new Error("Edge Function Failed");
    }
    
    // Check if function returned an error inside JSON
    if (data && data.error) {
        console.error("Supabase Function Logic Error:", data.error);
        throw new Error(data.error);
    }

    return data.eulogy;
}

// --- MAIN EXPORT ---
export const generateEulogy = async (
  name: string,
  description: string,
  language: string,
  cause: DeathCause,
  userLang: 'en' | 'zh',
  settings: LLMSettings,
  epitaph?: string
): Promise<string> => {
  const { provider, apiKey } = settings;
  
  // LOGIC: If OPENROUTER (The Saint) is selected AND no Key is provided -> Use Default (Server-side)
  if (provider === 'OPENROUTER' && !apiKey) {
      try {
          return await callSupabasePriest({
              name, description, language, cause, userLang, epitaph
          });
      } catch (error: any) {
          console.warn("Default Priest Failed, using fallback eulogy:", error);
          
          // HARD FALLBACK:
          // If the server is down, blocked, or rate-limited, we MUST return a string 
          // to allow the user to complete the "Burial" action.
          const fallbackEulogy = userLang === 'zh'
            ? `(连接中断) 这是一个关于 ${name} 的悲伤故事。它用 ${language} 写成，却因 ${cause} 而死。虽然 AI 牧师暂时失联了，但你的代码已入土为安。R.I.P.`
            : `(Connection Lost) This is a sad story about ${name}. Written in ${language}, it died due to ${cause}. The AI priest is currently offline, but your code rests in peace. R.I.P.`;
            
          return fallbackEulogy;
      }
  }

  // LOGIC: If other providers selected but no key -> Error
  if (!apiKey) {
    return userLang === 'zh' 
        ? "牧师罢工了（缺少 API Key）。没钱超度。"
        : "The priest is on strike (Missing API Key). Here lies a project that died, and we are too broke to eulogize it.";
  }

  // LOGIC: Has Key -> Use Client-side call (Reduces server cost/latency)
  const prompt = createPrompt(name, description, language, cause, userLang, epitaph);

  try {
    let result = "";

    switch (provider) {
        case 'GEMINI':
            result = await callGemini(prompt, apiKey);
            break;
        case 'OPENAI':
            result = await callOpenAICompatible(prompt, apiKey, "https://api.openai.com/v1", "gpt-3.5-turbo");
            break;
        case 'DEEPSEEK':
            // Direct DeepSeek usage
            result = await callOpenAICompatible(prompt, apiKey, "https://api.deepseek.com", "deepseek-chat");
            break;
        case 'OPENROUTER':
            // Client side OpenRouter call if they have their OWN key
            // Use free mistral or whatever they want
            result = await callOpenAICompatible(prompt, apiKey, "https://openrouter.ai/api/v1", "mistralai/devstral-2512:free");
            break;
        default:
            throw new Error("Unknown Provider");
    }

    return result || (userLang === 'zh' ? "安息吧。AI 已经无语凝噎。" : "Rest in peace. The AI is speechless.");

  } catch (error) {
    console.error(`${provider} API Error:`, error);
    return userLang === 'zh' 
        ? `这里躺着 ${name}。就连 ${provider} 牧师在写悼词时都崩溃了。R.I.P.`
        : `Here lies ${name}. Even the ${provider} priest crashed while trying to write this. R.I.P.`;
  }
};