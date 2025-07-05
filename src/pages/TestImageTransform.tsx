import React, { useState } from 'react';
import { processImage } from '@/services/imageProcessingService';
import './TestImageTransform.css';

interface ImagePreview {
  original: string;
  watermarked: string;
  thumbnail: string;
}

const TestImageTransform: React.FC = () => {
  const [frontImage, setFrontImage] = useState<ImagePreview | null>(null);
  const [backImage, setBackImage] = useState<ImagePreview | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const result = await processImage({
        file,
        fileName: file.name,
        fileSize: file.size,
        path: 'test-uploads',
        userId: 'test-user'
      });

      if (side === 'front') {
        setFrontImage(result);
      } else {
        setBackImage(result);
      }
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Error processing image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const ImageDisplay = ({ images, title }: { images: ImagePreview | null; title: string }) => (
    <div className="image-section">
      <h2><span>{title}</span></h2>
      <div className="image-grid">
        {images ? (
          <>
            <div className="image-container">
              <h3><span>Original</span></h3>
              <img 
                src={images.original} 
                alt="Original" 
              />
            </div>
            <div className="image-container">
              <h3><span>Watermarked</span></h3>
              <img 
                src={images.watermarked} 
                alt="Watermarked" 
              />
            </div>
            <div className="image-container">
              <h3><span>Thumbnail</span></h3>
              <img 
                src={images.thumbnail} 
                alt="Thumbnail" 
              />
            </div>
          </>
        ) : (
          <p className="no-image">No image uploaded</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="container">
      <h1><span>Image Processing Test</span></h1>
      
      <div className="upload-section">
        <div className="upload-buttons">
          <label className={`upload-button ${isProcessing ? 'disabled' : ''}`}>
            Upload Front Image
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'front')}
              disabled={isProcessing}
            />
          </label>

          <label className={`upload-button ${isProcessing ? 'disabled' : ''}`}>
            Upload Back Image
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'back')}
              disabled={isProcessing}
            />
          </label>
        </div>
      </div>

      <ImageDisplay images={frontImage} title="Front Image" />
      <ImageDisplay images={backImage} title="Back Image" />
    </div>
  );
};

export default TestImageTransform; 