
import React from 'react';
import { SimpleImageUpload } from './SimpleImageUpload';

export interface CollectionImageUploadProps {
  currentImage?: string;
  side: "front" | "back" | "other";
  onImageUploaded: (file: File) => void;
  disabled?: boolean;
}

const CollectionImageUpload = ({ 
  currentImage, 
  side, 
  onImageUploaded, 
  disabled = false 
}: CollectionImageUploadProps) => {
  return (
    <SimpleImageUpload
      currentImage={currentImage}
      onImageUploaded={onImageUploaded}
      disabled={disabled}
    />
  );
};

export default CollectionImageUpload;
