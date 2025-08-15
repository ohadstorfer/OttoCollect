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

    const requestBody = await req.json()
    
    // Handle both individual delete requests and queue processing
    if (requestBody.processQueue) {
      // Process cleanup queue
      console.log('Processing image cleanup queue...')
      
      const { data: queueItems, error: queueError } = await supabaseClient
        .from('image_cleanup_queue')
        .select('*')
        .eq('processed', false)
        .order('created_at', { ascending: true })
        .limit(50) // Process up to 50 items at a time

      if (queueError) {
        console.error('Error fetching cleanup queue:', queueError)
        throw queueError
      }

      const processedItems = []
      const errors = []

      for (const item of queueItems || []) {
        try {
          console.log(`Processing queue item: ${item.id} - ${item.image_url}`)
          
          // Special handling for collection_items
          if (item.table_name === 'collection_items' && item.banknote_id) {
            console.log(`Checking if banknote ${item.banknote_id} uses this image...`)
            
            const { data: banknote, error: banknoteError } = await supabaseClient
              .from('detailed_banknotes')
              .select('front_picture, back_picture, front_picture_watermarked, back_picture_watermarked, front_picture_thumbnail, back_picture_thumbnail')
              .eq('id', item.banknote_id)
              .single()

            if (!banknoteError && banknote) {
              const banknoteImages = [
                banknote.front_picture,
                banknote.back_picture,
                banknote.front_picture_watermarked,
                banknote.back_picture_watermarked,
                banknote.front_picture_thumbnail,
                banknote.back_picture_thumbnail
              ].filter(Boolean)

              if (banknoteImages.includes(item.image_url)) {
                console.log(`Image ${item.image_url} is used by banknote ${item.banknote_id}, skipping deletion`)
                // Mark as processed but skipped
                await supabaseClient
                  .from('image_cleanup_queue')
                  .update({ 
                    processed: true, 
                    processed_at: new Date().toISOString(),
                    error_message: 'Skipped - image used by associated banknote'
                  })
                  .eq('id', item.id)
                continue
              }
            }
          }

          // Extract file path from URL
          const storageBaseUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/banknote_images/`
          
          if (!item.image_url.startsWith(storageBaseUrl)) {
            console.log(`Image URL ${item.image_url} is not from our storage, skipping`)
            await supabaseClient
              .from('image_cleanup_queue')
              .update({ 
                processed: true, 
                processed_at: new Date().toISOString(),
                error_message: 'Skipped - image not from our storage'
              })
              .eq('id', item.id)
            continue
          }

          const filePath = item.image_url.replace(storageBaseUrl, '')
          console.log(`Deleting file: ${filePath}`)

          // Delete the file from storage
          const { error: deleteError } = await supabaseClient
            .storage
            .from('banknote_images')
            .remove([filePath])

          if (deleteError) {
            console.error('Error deleting file from storage:', deleteError)
            await supabaseClient
              .from('image_cleanup_queue')
              .update({ 
                processed: true, 
                processed_at: new Date().toISOString(),
                error_message: deleteError.message
              })
              .eq('id', item.id)
            errors.push({ itemId: item.id, error: deleteError.message })
          } else {
            console.log(`Successfully deleted image: ${filePath}`)
            await supabaseClient
              .from('image_cleanup_queue')
              .update({ 
                processed: true, 
                processed_at: new Date().toISOString()
              })
              .eq('id', item.id)
            processedItems.push({ itemId: item.id, filePath })
          }

        } catch (error) {
          console.error(`Error processing queue item ${item.id}:`, error)
          await supabaseClient
            .from('image_cleanup_queue')
            .update({ 
              processed: true, 
              processed_at: new Date().toISOString(),
              error_message: error.message
            })
            .eq('id', item.id)
          errors.push({ itemId: item.id, error: error.message })
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          processed: processedItems.length,
          errors: errors.length,
          details: { processedItems, errors }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle individual delete request (legacy support)
    const { imageUrl, tableName, recordId, banknoteId }: DeleteImageRequest = requestBody

    console.log(`Individual delete request - Image: ${imageUrl} from table: ${tableName}, record: ${recordId}`)

    // Special handling for collection_items
    if (tableName === 'collection_items' && banknoteId) {
      console.log(`Checking if banknote ${banknoteId} uses this image...`)
      
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