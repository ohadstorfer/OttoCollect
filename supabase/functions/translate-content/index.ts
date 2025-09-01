import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
};

interface TranslateRequest {
  text: string;
  targetLanguage: 'ar' | 'tr' | 'en';
  sourceLanguage?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, targetLanguage, sourceLanguage = 'en' }: TranslateRequest = await req.json();
    
    if (!text || !targetLanguage) {
      throw new Error("Missing required parameters: text and targetLanguage");
    }

    const apiKey = Deno.env.get("GOOGLE_TRANSLATE_API_KEY");
    if (!apiKey) {
      throw new Error("Google Translate API key not configured");
    }

    // Use Google Translate REST API
    const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: sourceLanguage,
        target: targetLanguage,
        format: 'text'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Translate API error: ${error}`);
    }

    const result = await response.json();
    const translatedText = result.data.translations[0].translatedText;

    return new Response(
      JSON.stringify({ 
        originalText: text,
        translatedText,
        targetLanguage,
        sourceLanguage 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);