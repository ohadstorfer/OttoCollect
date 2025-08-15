/**
 * Helper utility for enhanced image cleanup that covers all image types
 */

export const IMAGE_FIELD_MAPPINGS = {
  // Banknote images
  detailed_banknotes: [
    'front_picture',
    'back_picture', 
    'front_picture_watermarked',
    'back_picture_watermarked',
    'front_picture_thumbnail',
    'back_picture_thumbnail',
    'watermark_picture',
    'tughra_picture',
    'signature_pictures', // array
    'seal_pictures', // array
    'other_element_pictures' // array
  ],
  
  // Collection item images
  collection_items: [
    'obverse_image',
    'reverse_image',
    'obverse_image_watermarked', 
    'reverse_image_watermarked',
    'obverse_image_thumbnail',
    'reverse_image_thumbnail'
  ],
  
  // Profile images
  profiles: [
    'avatar_url'
  ],
  
  // Forum images
  forum_posts: [
    'image_urls' // array
  ],
  
  forum_announcements: [
    'image_urls' // array
  ],
  
  // Blog images
  blog_posts: [
    'main_image_url'
  ],
  
  // Image suggestions
  image_suggestions: [
    'obverse_image',
    'reverse_image',
    'obverse_image_watermarked',
    'reverse_image_watermarked', 
    'obverse_image_thumbnail',
    'reverse_image_thumbnail'
  ],
  
  // Country images
  countries: [
    'image_url'
  ]
};

export const STAMP_IMAGE_TYPES = [
  'tughra_pictures',
  'watermark_pictures', 
  'seal_pictures',
  'signatures_front',
  'signatures_back'
];

export function getAllImageTypes(): string[] {
  const allTypes: string[] = [];
  
  Object.values(IMAGE_FIELD_MAPPINGS).forEach(fields => {
    allTypes.push(...fields);
  });
  
  return [...new Set(allTypes)]; // Remove duplicates
}