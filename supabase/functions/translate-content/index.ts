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

interface DetectLanguageRequest {
  text: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;
    
    // Handle language detection endpoint
    if (path.endsWith('/detect')) {
      const { text }: DetectLanguageRequest = await req.json();
      
      console.log(`🔍 [EdgeFunction] Language detection request:`, { text: text?.substring(0, 50) + '...' });
      
      if (!text) {
        throw new Error("Missing required parameter: text");
      }

      const apiKey = Deno.env.get("GOOGLE_TRANSLATE_API_KEY");
      if (!apiKey) {
        console.error("❌ [EdgeFunction] Google Translate API key not configured");
        throw new Error("Google Translate API key not configured");
      }

      // Use Google Translate API language detection
      const response = await fetch(`https://translation.googleapis.com/language/translate/v2/detect?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`❌ [EdgeFunction] Google Translate API language detection error:`, error);
        throw new Error(`Google Translate API language detection error: ${error}`);
      }

      const result = await response.json();
      console.log(`🔍 [EdgeFunction] Language detection result:`, result);
      
      const detectedLanguage = result.data.detections[0][0].language;
      const confidence = result.data.detections[0][0].confidence;
      
      console.log(`✅ [EdgeFunction] Detected language: ${detectedLanguage} (confidence: ${confidence})`);

      return new Response(
        JSON.stringify({ 
          detectedLanguage,
          confidence,
          text: text.substring(0, 100) + '...'
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Handle translation endpoint (existing logic)
    const { text, targetLanguage, sourceLanguage = 'en' }: TranslateRequest = await req.json();
    
    console.log(`🔍 [EdgeFunction] Translation request:`, { text: text?.substring(0, 50) + '...', targetLanguage, sourceLanguage });
    
    if (!text || !targetLanguage) {
      throw new Error("Missing required parameters: text and targetLanguage");
    }

    // If source and target languages are the same, just return the original text
    if (sourceLanguage === targetLanguage) {
      console.log(`🔍 [EdgeFunction] Source and target languages are the same (${sourceLanguage}), returning original text`);
      return new Response(
        JSON.stringify({ 
          originalText: text,
          translatedText: text,
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
    }

    const apiKey = Deno.env.get("GOOGLE_TRANSLATE_API_KEY");
    if (!apiKey) {
      console.error("❌ [EdgeFunction] Google Translate API key not configured");
      throw new Error("Google Translate API key not configured");
    }
    
    console.log(`🔍 [EdgeFunction] API key found, proceeding with Google Translate API call`);

    // Use Google Translate REST API
    console.log(`🔍 [EdgeFunction] Making Google Translate API request:`, {
      url: `https://translation.googleapis.com/language/translate/v2?key=${apiKey.substring(0, 10)}...`,
      body: { q: text, source: sourceLanguage, target: targetLanguage, format: 'text' }
    });
    
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

    console.log(`🔍 [EdgeFunction] Google Translate API response status:`, response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ [EdgeFunction] Google Translate API error:`, error);
      throw new Error(`Google Translate API error: ${error}`);
    }

    const result = await response.json();
    console.log(`🔍 [EdgeFunction] Google Translate API result:`, result);
    
    const translatedText = result.data.translations[0].translatedText;
    console.log(`✅ [EdgeFunction] Extracted translated text: "${translatedText}"`);

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
  } catch (error) {
    console.error("❌ [EdgeFunction] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Unknown error occurred",
        success: false
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
};

serve(handler);