import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeleteImageRequest {
  imageUrl: string
  tableName: string
  recordId: string
  banknoteId?: string // For collection_items to check banknote usage
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { imageUrl, tableName, recordId, banknoteId }: DeleteImageRequest = await req.json()

    console.log(`Attempting to delete image: ${imageUrl} from table: ${tableName}, record: ${recordId}`)

    // Special handling for collection_items
    if (tableName === 'collection_items' && banknoteId) {
      console.log(`Checking if banknote ${banknoteId} uses this image...`)
      
      // Check if the banknote uses this image as front or back picture
      const { data: banknote, error: banknoteError } = await supabaseClient
        .from('detailed_banknotes')
        .select('front_picture, back_picture, front_picture_watermarked, back_picture_watermarked, front_picture_thumbnail, back_picture_thumbnail')
        .eq('id', banknoteId)
        .single()

      if (banknoteError) {
        console.error('Error fetching banknote:', banknoteError)
        throw banknoteError
      }

      if (banknote) {
        const banknoteImages = [
          banknote.front_picture,
          banknote.back_picture,
          banknote.front_picture_watermarked,
          banknote.back_picture_watermarked,
          banknote.front_picture_thumbnail,
          banknote.back_picture_thumbnail
        ].filter(Boolean)

        if (banknoteImages.includes(imageUrl)) {
          console.log(`Image ${imageUrl} is used by banknote ${banknoteId}, skipping deletion`)
          return new Response(
            JSON.stringify({ 
              success: true, 
              skipped: true, 
              reason: 'Image is used by associated banknote' 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    // Extract file path from URL
    const storageBaseUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/banknote_images/`
    
    if (!imageUrl.startsWith(storageBaseUrl)) {
      console.log(`Image URL ${imageUrl} is not from our storage, skipping deletion`)
      return new Response(
        JSON.stringify({ 
          success: true, 
          skipped: true, 
          reason: 'Image is not from our storage' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const filePath = imageUrl.replace(storageBaseUrl, '')
    console.log(`Extracted file path: ${filePath}`)

    // Delete the file from storage
    const { error: deleteError } = await supabaseClient
      .storage
      .from('banknote_images')
      .remove([filePath])

    if (deleteError) {
      console.error('Error deleting file from storage:', deleteError)
      throw deleteError
    }

    console.log(`Successfully deleted image: ${filePath}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted: true, 
        filePath 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in delete-old-image function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})