import { supabase } from '@/integrations/supabase/client';

interface ProcessedImages {
  original: string;
  watermarked: string;
  thumbnail: string;
}

// === Watermark tuning knobs — change these to adjust size, position, and opacity ===
// Todos los valores son ratios (0..1) — escalan con el tamaño de la imagen.
export const WATERMARK_WIDTH_RATIO_PORTRAIT = 0.35;        // tamaño del watermark = % del ancho (portrait)
export const WATERMARK_WIDTH_RATIO_LANDSCAPE = 0.15;       // tamaño del watermark = % del ancho (landscape)
export const WATERMARK_PADDING_X_RATIO_PORTRAIT = 0.04;    // separación del borde derecho = % del ancho (portrait)
export const WATERMARK_PADDING_Y_RATIO_PORTRAIT = 0.025;   // separación del borde inferior = % del alto (portrait)
export const WATERMARK_PADDING_X_RATIO_LANDSCAPE = 0.08;   // separación del borde derecho = % del ancho (landscape) — subilo para moverlo a la izquierda
export const WATERMARK_PADDING_Y_RATIO_LANDSCAPE = 0.14;   // separación del borde inferior = % del alto (landscape) — subilo para moverlo arriba
export const WATERMARK_OPACITY = 0.5;                      // 0..1
// ==================================================================================

export interface WatermarkSettings {
  widthRatioPortrait: number;
  widthRatioLandscape: number;
  paddingXRatioPortrait: number;
  paddingYRatioPortrait: number;
  paddingXRatioLandscape: number;
  paddingYRatioLandscape: number;
  opacity: number;
}

export const DEFAULT_WATERMARK_SETTINGS: WatermarkSettings = {
  widthRatioPortrait: WATERMARK_WIDTH_RATIO_PORTRAIT,
  widthRatioLandscape: WATERMARK_WIDTH_RATIO_LANDSCAPE,
  paddingXRatioPortrait: WATERMARK_PADDING_X_RATIO_PORTRAIT,
  paddingYRatioPortrait: WATERMARK_PADDING_Y_RATIO_PORTRAIT,
  paddingXRatioLandscape: WATERMARK_PADDING_X_RATIO_LANDSCAPE,
  paddingYRatioLandscape: WATERMARK_PADDING_Y_RATIO_LANDSCAPE,
  opacity: WATERMARK_OPACITY,
};

export interface WatermarkParamsApplied {
  isLandscape: boolean;
  widthRatio: number;
  paddingXRatio: number;
  paddingYRatio: number;
  paddingX: number;
  paddingY: number;
  opacity: number;
  watermarkWidth: number;
  watermarkHeight: number;
}

/**
 * Renders the watermark onto a canvas containing the original image.
 * Pure: does not touch Supabase. Reused by both the upload pipeline and the preview page.
 */
export async function generateWatermarkedCanvas(
  originalImage: ImageBitmap,
  settings: WatermarkSettings = DEFAULT_WATERMARK_SETTINGS
): Promise<{ canvas: HTMLCanvasElement; params: WatermarkParamsApplied }> {
  const canvas = document.createElement('canvas');
  canvas.width = originalImage.width;
  canvas.height = originalImage.height;
  const ctx = canvas.getContext('2d', {
    alpha: true,
    willReadFrequently: false,
  })!;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(originalImage, 0, 0);

  const watermarkImage = new Image();
  watermarkImage.src = '/watermark.png';
  await new Promise((resolve, reject) => {
    watermarkImage.onload = resolve;
    watermarkImage.onerror = (e) => {
      console.error('Failed to load watermark:', e);
      reject(e);
    };
  });

  const isLandscape = originalImage.width > originalImage.height;
  const widthRatio = isLandscape
    ? settings.widthRatioLandscape
    : settings.widthRatioPortrait;
  const paddingXRatio = isLandscape
    ? settings.paddingXRatioLandscape
    : settings.paddingXRatioPortrait;
  const paddingYRatio = isLandscape
    ? settings.paddingYRatioLandscape
    : settings.paddingYRatioPortrait;

  const paddingX = originalImage.width * paddingXRatio;
  const paddingY = originalImage.height * paddingYRatio;

  const watermarkWidth = originalImage.width * widthRatio;
  const watermarkHeight = (watermarkWidth / watermarkImage.width) * watermarkImage.height;
  const watermarkX = originalImage.width - watermarkWidth - paddingX;
  const watermarkY = originalImage.height - watermarkHeight - paddingY;

  ctx.globalAlpha = settings.opacity;
  ctx.drawImage(watermarkImage, watermarkX, watermarkY, watermarkWidth, watermarkHeight);
  ctx.globalAlpha = 1;

  return {
    canvas,
    params: {
      isLandscape,
      widthRatio,
      paddingXRatio,
      paddingYRatio,
      paddingX,
      paddingY,
      opacity: settings.opacity,
      watermarkWidth,
      watermarkHeight,
    },
  };
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

    const { canvas: watermarkedCanvas } = await generateWatermarkedCanvas(originalImage);

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


