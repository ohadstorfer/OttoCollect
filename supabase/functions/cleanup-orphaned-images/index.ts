import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ImageReference {
  table: string
  column: string
  url: string
  id: string
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

    console.log('Starting orphaned image cleanup...')

    // Define all tables and their image columns
    const imageColumns = [
      // collection_items
      { table: 'collection_items', columns: ['obverse_image', 'reverse_image', 'obverse_image_watermarked', 'reverse_image_watermarked', 'obverse_image_thumbnail', 'reverse_image_thumbnail'] },
      
      // detailed_banknotes
      { table: 'detailed_banknotes', columns: ['front_picture', 'back_picture', 'front_picture_watermarked', 'back_picture_watermarked', 'front_picture_thumbnail', 'back_picture_thumbnail', 'watermark_picture', 'tughra_picture'], arrayColumns: ['signature_pictures', 'seal_pictures', 'other_element_pictures'] },
      
      // forum_announcements
      { table: 'forum_announcements', arrayColumns: ['image_urls'] },
      
      // forum_posts
      { table: 'forum_posts', arrayColumns: ['image_urls'] },
      
      // image_suggestions
      { table: 'image_suggestions', columns: ['obverse_image', 'reverse_image', 'obverse_image_watermarked', 'reverse_image_watermarked', 'obverse_image_thumbnail', 'reverse_image_thumbnail'] },
      
      // profiles
      { table: 'profiles', columns: ['avatar_url'] },
      
      // unlisted_banknotes (if exists)
      { table: 'unlisted_banknotes', columns: ['front_picture', 'back_picture'] },
    ]

    // Collect all image URLs from database
    const allImageUrls = new Set<string>()
    const imageReferences: ImageReference[] = []

    for (const tableConfig of imageColumns) {
      console.log(`Processing table: ${tableConfig.table}`)
      
      // Get all records from this table
      const { data: records, error } = await supabaseClient
        .from(tableConfig.table)
        .select('*')

      if (error) {
        console.error(`Error fetching from ${tableConfig.table}:`, error)
        continue
      }

      if (!records) continue

      for (const record of records) {
        // Process regular columns
        if (tableConfig.columns) {
          for (const column of tableConfig.columns) {
            const url = record[column]
            if (url && typeof url === 'string' && url.trim()) {
              allImageUrls.add(url)
              imageReferences.push({
                table: tableConfig.table,
                column,
                url,
                id: record.id
              })
            }
          }
        }

        // Process array columns
        if (tableConfig.arrayColumns) {
          for (const column of tableConfig.arrayColumns) {
            const urls = record[column]
            if (Array.isArray(urls)) {
              for (const url of urls) {
                if (url && typeof url === 'string' && url.trim()) {
                  allImageUrls.add(url)
                  imageReferences.push({
                    table: tableConfig.table,
                    column,
                    url,
                    id: record.id
                  })
                }
              }
            }
          }
        }
      }
    }

    console.log(`Found ${allImageUrls.size} unique image URLs in database`)
    console.log(`Found ${imageReferences.length} total image references`)

    // Get all files from storage bucket
    const { data: storageFiles, error: storageError } = await supabaseClient
      .storage
      .from('banknote_images')
      .list('', {
        limit: 10000,
        sortBy: { column: 'name', order: 'asc' }
      })

    if (storageError) {
      console.error('Error listing storage files:', storageError)
      throw storageError
    }

    // Get all nested files recursively
    const getAllFiles = async (prefix = ''): Promise<string[]> => {
      const files: string[] = []
      
      const { data: items, error } = await supabaseClient
        .storage
        .from('banknote_images')
        .list(prefix, {
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' }
        })

      if (error) {
        console.error(`Error listing files in ${prefix}:`, error)
        return files
      }

      if (!items) return files

      for (const item of items) {
        const fullPath = prefix ? `${prefix}/${item.name}` : item.name
        
        if (item.id === null) {
          // This is a folder, recurse into it
          const subFiles = await getAllFiles(fullPath)
          files.push(...subFiles)
        } else {
          // This is a file
          files.push(fullPath)
        }
      }

      return files
    }

    const allStorageFiles = await getAllFiles()
    console.log(`Found ${allStorageFiles.length} files in storage`)

    // Find orphaned files
    const orphanedFiles: string[] = []
    const storageBaseUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/banknote_images/`

    for (const filePath of allStorageFiles) {
      const fullUrl = storageBaseUrl + filePath
      
      // Check if this file URL exists in our database references
      const isReferenced = Array.from(allImageUrls).some(dbUrl => 
        dbUrl === fullUrl || dbUrl.endsWith(filePath)
      )

      if (!isReferenced) {
        orphanedFiles.push(filePath)
      }
    }

    console.log(`Found ${orphanedFiles.length} orphaned files`)

    // Delete orphaned files (in batches to avoid timeouts)
    const batchSize = 50
    let deletedCount = 0
    const errors: string[] = []

    for (let i = 0; i < orphanedFiles.length; i += batchSize) {
      const batch = orphanedFiles.slice(i, i + batchSize)
      
      try {
        const { error: deleteError } = await supabaseClient
          .storage
          .from('banknote_images')
          .remove(batch)

        if (deleteError) {
          console.error(`Error deleting batch ${i}-${i + batch.length}:`, deleteError)
          errors.push(`Batch ${i}-${i + batch.length}: ${deleteError.message}`)
        } else {
          deletedCount += batch.length
          console.log(`Deleted batch ${i}-${i + batch.length} (${batch.length} files)`)
        }
      } catch (error) {
        console.error(`Exception deleting batch ${i}-${i + batch.length}:`, error)
        errors.push(`Batch ${i}-${i + batch.length}: ${error.message}`)
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    const result = {
      success: true,
      summary: {
        totalDbImages: allImageUrls.size,
        totalDbReferences: imageReferences.length,
        totalStorageFiles: allStorageFiles.length,
        orphanedFiles: orphanedFiles.length,
        deletedFiles: deletedCount,
        errors: errors.length
      },
      orphanedFilesList: orphanedFiles.slice(0, 100), // Return first 100 for inspection
      errors: errors.slice(0, 10) // Return first 10 errors
    }

    console.log('Cleanup completed:', result.summary)

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in cleanup function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})