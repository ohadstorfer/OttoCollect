-- Add image version fields to detailed_banknotes table
ALTER TABLE detailed_banknotes
ADD COLUMN front_picture_watermarked text,
ADD COLUMN back_picture_watermarked text,
ADD COLUMN front_picture_thumbnail text,
ADD COLUMN back_picture_thumbnail text;

-- Add image version fields to collection_items table
ALTER TABLE collection_items 
ADD COLUMN obverse_image_watermarked text,
ADD COLUMN reverse_image_watermarked text,
ADD COLUMN obverse_image_thumbnail text,
ADD COLUMN reverse_image_thumbnail text,
ADD COLUMN personal_images text[],
ADD COLUMN personal_images_watermarked text[],
ADD COLUMN personal_images_thumbnails text[];

-- Add image version fields to image_suggestions table
ALTER TABLE image_suggestions
ADD COLUMN obverse_image_watermarked text,
ADD COLUMN reverse_image_watermarked text,
ADD COLUMN obverse_image_thumbnail text,
ADD COLUMN reverse_image_thumbnail text; 