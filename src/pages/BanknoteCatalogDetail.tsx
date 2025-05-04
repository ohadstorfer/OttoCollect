
// Import the normalizeImageUrls helper function
import { normalizeImageUrls } from '@/services/catalogService';

// Fix the openImageViewer function to use normalizeImageUrls
const openImageViewer = (imageUrl: string | string[]) => {
  const normalizedUrls = normalizeImageUrls(imageUrl);
  
  if (normalizedUrls.length === 0) return;
  
  setCurrentImageIndex(0);
  setGalleryImages(normalizedUrls);
  setIsViewerOpen(true);
};
