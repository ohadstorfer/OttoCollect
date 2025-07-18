import { DetailedBanknote } from "@/types";

export const mapBanknoteFromDatabase = (banknote: any): DetailedBanknote => {
  // Destructure all fields from the database record
  const {
    id,
    country,
    extended_pick_number,
    pick_number,
    turk_catalog_number,
    face_value,
    islamic_year,
    gregorian_year,
    sultan_name,
    category,
    type,
    rarity,
    printer,
    security_element,
    colors,
    serial_numbering,
    banknote_description,
    historical_description,
    dimensions,
    signatures_front,
    signatures_back,
    signature_pictures,
    seal_names,
    seal_pictures,
    watermark_picture,
    tughra_picture,
    other_element_pictures,
    front_picture,
    back_picture,
    front_picture_watermarked,
    back_picture_watermarked,
    front_picture_thumbnail,
    back_picture_thumbnail,
    is_approved,
    is_pending,
    created_at,
    updated_at,
    authority_name,
    
    // Enhanced view resolved URLs
    signatures_front_urls,
    signatures_back_urls,
    seal_picture_urls,
    watermark_picture_url,
    tughra_picture_url
  } = banknote;

  console.log('Mapping banknote with dimensions:', dimensions);

  return {
    id,
    catalogId: extended_pick_number,
    extendedPickNumber: extended_pick_number,
    country,
    denomination: face_value,
    year: gregorian_year || islamic_year || '',
    series: '',
    description: banknote_description || '',
    obverseDescription: '',
    reverseDescription: '',
    imageUrls: [front_picture, back_picture].filter(Boolean),
    isApproved: is_approved || false,
    isPending: is_pending || false,
    createdAt: created_at,
    updatedAt: updated_at,
    
    // Additional fields from detailed_banknotes
    pickNumber: pick_number,
    turkCatalogNumber: turk_catalog_number,
    sultanName: sultan_name,
    sealNames: seal_names,
    rarity,
    printer,
    type,
    category,
    islamicYear: islamic_year,
    gregorianYear: gregorian_year,
    banknoteDescription: banknote_description,
    historicalDescription: historical_description,
    serialNumbering: serial_numbering,
    securityElement: security_element,
    dimensions: dimensions,
    
    // Signature fields with array handling
    signaturesFront: Array.isArray(signatures_front) ? signatures_front.join(', ') : (signatures_front || ''),
    signaturesBack: Array.isArray(signatures_back) ? signatures_back.join(', ') : (signatures_back || ''),
    colors,
    watermark: watermark_picture,
    
    // New resolved URL fields from the enhanced view
    signaturesFrontUrls: signatures_front_urls || [],
    signaturesBackUrls: signatures_back_urls || [],
    sealPictureUrls: seal_picture_urls || [],
    watermarkUrl: watermark_picture_url,
    tughraUrl: tughra_picture_url,
    otherElementPictures: other_element_pictures || [],
    
    // Legacy compatibility properties
    signaturePictureUrls: signature_pictures || [],
    
    // New authority_name field
    authorityName: authority_name,

    // New watermarked and thumbnail image fields
    frontPictureWatermarked: front_picture_watermarked,
    backPictureWatermarked: back_picture_watermarked,
    frontPictureThumbnail: front_picture_thumbnail,
    backPictureThumbnail: back_picture_thumbnail,
  };
};
