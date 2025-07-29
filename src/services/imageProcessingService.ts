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
    const originalImage = await createImageBitmap(file, {
      imageOrientation: 'from-image', // Preserve EXIF orientation
      premultiplyAlpha: 'premultiply', // Better quality for transparent images
      colorSpaceConversion: 'default'
    });
    
    // Create a canvas for the watermarked version with high DPI support
    const watermarkedCanvas = document.createElement('canvas');
    const scale = window.devicePixelRatio || 1; // Support high DPI displays
    watermarkedCanvas.width = originalImage.width;
    watermarkedCanvas.height = originalImage.height;
    const watermarkedCtx = watermarkedCanvas.getContext('2d', {
      alpha: true,
      willReadFrequently: false
    })!;

    // Enable high-quality image scaling
    watermarkedCtx.imageSmoothingEnabled = true;
    watermarkedCtx.imageSmoothingQuality = 'high';
    
    // Draw the original image at full quality
    watermarkedCtx.drawImage(originalImage, 0, 0);
    
    // Load and draw watermark image
    const watermarkImage = new Image();
    watermarkImage.src = '/watermark.png';
    await new Promise((resolve, reject) => {
      watermarkImage.onload = resolve;
      watermarkImage.onerror = (e) => {
        console.error('Failed to load watermark:', e);
        reject(e);
      };
    });

    // Calculate watermark dimensions (35% of the original image width)
    const watermarkWidth = originalImage.width * 0.35;
    const watermarkHeight = (watermarkWidth / watermarkImage.width) * watermarkImage.height;

    // Position watermark at bottom right with padding
    const padding = 40;
    const watermarkX = originalImage.width - watermarkWidth - padding;
    const watermarkY = originalImage.height - watermarkHeight - padding;

    // Set transparency
    watermarkedCtx.globalAlpha = 0.6;
    
    // Draw the watermark with high quality
    watermarkedCtx.drawImage(
      watermarkImage,
      watermarkX,
      watermarkY,
      watermarkWidth,
      watermarkHeight
    );

    // Reset transparency
    watermarkedCtx.globalAlpha = 1;
    
    // Create thumbnail version (max 300px width/height while maintaining aspect ratio)
    const thumbnailCanvas = document.createElement('canvas');
    const maxThumbnailSize = 300;
    let thumbnailWidth = originalImage.width;
    let thumbnailHeight = originalImage.height;
    
    // Only scale down, never up
    if (thumbnailWidth <= maxThumbnailSize && thumbnailHeight <= maxThumbnailSize) {
      // Image is already smaller than thumbnail size, use original dimensions
      thumbnailWidth = originalImage.width;
      thumbnailHeight = originalImage.height;
    } else if (thumbnailWidth > thumbnailHeight) {
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
    
    // Round dimensions to prevent sub-pixel rendering issues
    thumbnailWidth = Math.round(thumbnailWidth);
    thumbnailHeight = Math.round(thumbnailHeight);
    
    // Set thumbnail canvas with high DPI support
    const thumbnailScale = window.devicePixelRatio || 1;
    thumbnailCanvas.width = thumbnailWidth * thumbnailScale;
    thumbnailCanvas.height = thumbnailHeight * thumbnailScale;
    thumbnailCanvas.style.width = `${thumbnailWidth}px`;
    thumbnailCanvas.style.height = `${thumbnailHeight}px`;
    
    const thumbnailCtx = thumbnailCanvas.getContext('2d', {
      alpha: true,
      willReadFrequently: false
    })!;

    // Enable high-quality image scaling for thumbnail
    thumbnailCtx.scale(thumbnailScale, thumbnailScale);
    thumbnailCtx.imageSmoothingEnabled = true;
    thumbnailCtx.imageSmoothingQuality = 'high';

    // For small images, draw directly without stepped downscaling
    if (originalImage.width <= maxThumbnailSize && originalImage.height <= maxThumbnailSize) {
      thumbnailCtx.drawImage(originalImage, 0, 0, thumbnailWidth, thumbnailHeight);
    } else {
      // Use a stepped downscaling approach for better quality on larger images
      let currentWidth = originalImage.width;
      let currentHeight = originalImage.height;
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.imageSmoothingEnabled = true;
      tempCtx.imageSmoothingQuality = 'high';

      // Step down the image in increments for better quality
      while (currentWidth > thumbnailWidth * 2 || currentHeight > thumbnailHeight * 2) {
        currentWidth = Math.max(currentWidth / 2, thumbnailWidth);
        currentHeight = Math.max(currentHeight / 2, thumbnailHeight);
        
        tempCanvas.width = currentWidth;
        tempCanvas.height = currentHeight;
        tempCtx.drawImage(originalImage, 0, 0, currentWidth, currentHeight);
      }

      // Final draw at target size
      thumbnailCtx.drawImage(
        currentWidth === thumbnailWidth ? tempCanvas : originalImage,
        0, 0, thumbnailWidth, thumbnailHeight
      );
    }

    // Convert canvases to blobs with high quality
    const watermarkedBlob = await new Promise<Blob>((resolve) => 
      watermarkedCanvas.toBlob(blob => resolve(blob!), 'image/jpeg', 1.0) // Maximum quality for watermarked
    );
    
    const thumbnailBlob = await new Promise<Blob>((resolve) => 
      thumbnailCanvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.95) // High quality for thumbnail
    );

    // Upload all versions to storage
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


