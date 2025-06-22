
import { supabase } from '@/integrations/supabase/client';

interface ProcessedImages {
  original: string;
  watermarked: string;
  thumbnail: string;
}

/**
 * Processes an uploaded image to create watermarked and thumbnail versions
 * @param file The original file to process
 * @param path The base storage path (e.g., 'collection-items' or 'unlisted-banknotes')
 * @param userId The user's ID
 * @returns Object containing URLs for all image versions
 */
export async function processAndUploadImage(
  file: File,
  path: string,
  userId: string
): Promise<ProcessedImages> {
  try {
    // Generate unique identifiers for each version
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const baseFileName = `${userId}_${timestamp}`;
    
    // Create paths for each version
    const originalPath = `${path}/original/${baseFileName}.${fileExt}`;
    const watermarkedPath = `${path}/watermarked/${baseFileName}.${fileExt}`;
    const thumbnailPath = `${path}/thumbnail/${baseFileName}.${fileExt}`;

    // Process the original image
    const originalImage = await createImageBitmap(file);
    
    // Load the watermark image
    const watermarkResponse = await fetch('/watermark.png');
    const watermarkBlob = await watermarkResponse.blob();
    const watermarkImage = await createImageBitmap(watermarkBlob);
    
    // Create a canvas for the watermarked version
    const watermarkedCanvas = document.createElement('canvas');
    watermarkedCanvas.width = originalImage.width;
    watermarkedCanvas.height = originalImage.height;
    const watermarkedCtx = watermarkedCanvas.getContext('2d')!;
    
    // Draw the original image
    watermarkedCtx.drawImage(originalImage, 0, 0);
    
    // Set transparency for watermark (40% = 0.4)
    watermarkedCtx.globalAlpha = 0.4;
    
    // Calculate watermark position (bottom right corner with some padding)
    const padding = 20;
    const watermarkWidth = Math.min(watermarkImage.width, originalImage.width * 0.2); // Max 20% of original width
    const watermarkHeight = (watermarkImage.height / watermarkImage.width) * watermarkWidth; // Maintain aspect ratio
    
    const watermarkX = originalImage.width - watermarkWidth - padding;
    const watermarkY = originalImage.height - watermarkHeight - padding;
    
    // Draw the watermark image
    watermarkedCtx.drawImage(
      watermarkImage, 
      watermarkX, 
      watermarkY, 
      watermarkWidth, 
      watermarkHeight
    );
    
    // Reset alpha for any future drawing
    watermarkedCtx.globalAlpha = 1.0;
    
    // Create thumbnail version (max 300px width/height while maintaining aspect ratio)
    const thumbnailCanvas = document.createElement('canvas');
    const maxThumbnailSize = 300;
    let thumbnailWidth = originalImage.width;
    let thumbnailHeight = originalImage.height;
    
    if (thumbnailWidth > thumbnailHeight) {
      if (thumbnailWidth > maxThumbnailSize) {
        thumbnailHeight *= maxThumbnailSize / thumbnailWidth;
        thumbnailWidth = maxThumbnailSize;
      }
    } else {
      if (thumbnailHeight > maxThumbnailSize) {
        thumbnailWidth *= maxThumbnailSize / thumbnailHeight;
        thumbnailHeight = maxThumbnailSize;
      }
    }
    
    thumbnailCanvas.width = thumbnailWidth;
    thumbnailCanvas.height = thumbnailHeight;
    const thumbnailCtx = thumbnailCanvas.getContext('2d')!;
    thumbnailCtx.drawImage(originalImage, 0, 0, thumbnailWidth, thumbnailHeight);

    // Convert canvases to blobs
    const watermarkedBlob = await new Promise<Blob>((resolve) => 
      watermarkedCanvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.9)
    );
    
    const thumbnailBlob = await new Promise<Blob>((resolve) => 
      thumbnailCanvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.8)
    );

    // Upload all versions to storage using the correct bucket name
    const [originalUpload, watermarkedUpload, thumbnailUpload] = await Promise.all([
      supabase.storage
        .from('banknote_images')
        .upload(originalPath, file, { upsert: true }),
      supabase.storage
        .from('banknote_images')
        .upload(watermarkedPath, watermarkedBlob, { upsert: true }),
      supabase.storage
        .from('banknote_images')
        .upload(thumbnailPath, thumbnailBlob, { upsert: true })
    ]);

    if (originalUpload.error) throw originalUpload.error;
    if (watermarkedUpload.error) throw watermarkedUpload.error;
    if (thumbnailUpload.error) throw thumbnailUpload.error;

    // Get public URLs for all versions
    const {
      data: { publicUrl: originalUrl }
    } = supabase.storage.from('banknote_images').getPublicUrl(originalPath);
    
    const {
      data: { publicUrl: watermarkedUrl }
    } = supabase.storage.from('banknote_images').getPublicUrl(watermarkedPath);
    
    const {
      data: { publicUrl: thumbnailUrl }
    } = supabase.storage.from('banknote_images').getPublicUrl(thumbnailPath);

    return {
      original: originalUrl,
      watermarked: watermarkedUrl,
      thumbnail: thumbnailUrl
    };
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}
