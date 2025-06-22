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
    
    // Create a canvas for the watermarked version
    const watermarkedCanvas = document.createElement('canvas');
    watermarkedCanvas.width = originalImage.width;
    watermarkedCanvas.height = originalImage.height;
    const watermarkedCtx = watermarkedCanvas.getContext('2d')!;
    
    // Draw the original image
    watermarkedCtx.drawImage(originalImage, 0, 0);
    
    // Add watermark
    watermarkedCtx.font = '700 24px var(--font-serif)'; // Match text-xl font style
    watermarkedCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    const watermarkText = 'OttoCollect';
    const padding = 20;
    const metrics = watermarkedCtx.measureText(watermarkText);
    const watermarkX = padding;
    const watermarkY = watermarkedCanvas.height - padding;
    
    // Add shadow for better visibility
    watermarkedCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    watermarkedCtx.shadowBlur = 4;
    watermarkedCtx.shadowOffsetX = 2;
    watermarkedCtx.shadowOffsetY = 2;
    
    // Draw the watermark text
    watermarkedCtx.fillText(watermarkText, watermarkX, watermarkY);
    
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

    // Upload all versions to storage
    const [originalUpload, watermarkedUpload, thumbnailUpload] = await Promise.all([
      supabase.storage
        .from('banknote-images')
        .upload(originalPath, file, { upsert: true }),
      supabase.storage
        .from('banknote-images')
        .upload(watermarkedPath, watermarkedBlob, { upsert: true }),
      supabase.storage
        .from('banknote-images')
        .upload(thumbnailPath, thumbnailBlob, { upsert: true })
    ]);

    if (originalUpload.error) throw originalUpload.error;
    if (watermarkedUpload.error) throw watermarkedUpload.error;
    if (thumbnailUpload.error) throw thumbnailUpload.error;

    // Get public URLs for all versions
    const {
      data: { publicUrl: originalUrl }
    } = supabase.storage.from('banknote-images').getPublicUrl(originalPath);
    
    const {
      data: { publicUrl: watermarkedUrl }
    } = supabase.storage.from('banknote-images').getPublicUrl(watermarkedPath);
    
    const {
      data: { publicUrl: thumbnailUrl }
    } = supabase.storage.from('banknote-images').getPublicUrl(thumbnailPath);

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
