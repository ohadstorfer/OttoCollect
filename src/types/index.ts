
// Remove duplicate isRead declaration and consolidate
export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  content_ar?: string;
  content_tr?: string;
  created_at: string;
  isRead: boolean;
  reference_item_id?: string;
  
  // Alias properties for compatibility
  senderId: string;
  receiverId: string;
  createdAt: string;
  recipientId: string;
}

export interface Conversation {
  otherUserId: string;
  otherUser: {
    id: string;
    username: string;
    avatarUrl?: string;
    rank: string;
  };
  lastMessage: Message;
  unreadCount: number;
}

export interface Role {
  id: string;
  name: string;
  name_ar?: string;
  name_tr?: string;
  created_at: string;
}

// Add explicit UserRank type with new ranking system
export type UserRank = 
  | 'Newbie Collector'
  | 'Beginner Collector' 
  | 'Mid Collector'
  | 'Known Collector'
  | 'Advance Collector'
  | 'Master Collector'
  | 'Admin Newbie Collector'
  | 'Admin Beginner Collector'
  | 'Admin Mid Collector'
  | 'Admin Known Collector'
  | 'Admin Advance Collector'
  | 'Admin Master Collector'
  | 'Super Admin Newbie Collector'
  | 'Super Admin Beginner Collector'
  | 'Super Admin Mid Collector'
  | 'Super Admin Known Collector'
  | 'Super Admin Advance Collector'
  | 'Super Admin Master Collector';

export type UserRole = string;

// Add interface for country admin assignment
export interface CountryAdminAssignment {
  id: string;
  user_id: string;
  country_id: string;
  created_at: string;
}

// User related interfaces
export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  about?: string;
  about_ar?: string;
  about_tr?: string;
  country?: string;
  role_id: string;
  role: UserRole;
  originalRole?: UserRole; // Add original role for admin detection
  role_ar?: string;
  role_tr?: string;
  rank: string;
  points: number;
  createdAt: string;
  updatedAt?: string;
  blocked?: boolean;
  is_forum_blocked?: boolean;
  facebook_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  linkedin_url?: string;
}

// Add missing Banknote interface
export interface Banknote {
  id: string;
  catalogId: string;
  country: string;
  extendedPickNumber: string;
  pickNumber?: string;
  turkCatalogNumber?: string;
  denomination: string;
  year?: string;
  series?: string;
  sultanName?: string;
  type?: string;
  category?: string;
  rarity?: string;
  printer?: string;
  imageUrls?: string[];
  frontPicture?: string;
  backPicture?: string;
  signaturePictureUrls?: string[];
  sealPictureUrls?: string[];
  watermarkUrl?: string;
  tughraUrl?: string;
  authorityName?: string;
  description?: string;
  obverseDescription?: string;
  reverseDescription?: string;
  isApproved?: boolean;
  isPending?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Add missing CountryData interface
export interface CountryData {
  id: string;
  name: string;
  name_ar?: string;
  name_tr?: string;
  description?: string;
  image_url?: string;
  created_at: string;
  updated_at?: string;
  imageUrl?: string;
  banknoteCount?: number;
  display_order?: number;
}

// Banknote related interfaces
export type BanknoteCondition = 
  | 'UNC' 
  | 'AU' 
  | 'XF/AU'
  | 'XF' 
  | 'VF/XF'
  | 'VF' 
  | 'F/VF'
  | 'F' 
  | 'VG/F'
  | 'VG' 
  | 'G' 
  | 'FR'
  | 'Fair' 
  | 'Poor';

export interface BanknoteFilters {
  search?: string;
  country_id?: string;
  categories?: string[];
  types?: string[];
  sort?: string[];
}

export interface CollectionItem {
  id: string;
  user_id: string;
  banknote_id?: string;
  is_unlisted_banknote: boolean;
  unlisted_banknotes_id?: string;
  condition?: BanknoteCondition;
  purchase_price?: number;
  purchase_date?: string;
  sale_price?: number;
  is_for_sale: boolean;
  public_note?: string;
  private_note?: string;
  location?: string;
  obverse_image?: string;
  reverse_image?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
  grade?: string;
  grade_by?: string;
  grade_condition_description?: string;

  // New watermarked and thumbnail image fields
  obverse_image_watermarked?: string;
  reverse_image_watermarked?: string;
  obverse_image_thumbnail?: string;
  reverse_image_thumbnail?: string;

  // Alias properties for compatibility with frontend code
  userId: string;
  banknoteId?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  salePrice?: number;
  isForSale: boolean;
  publicNote?: string;
  privateNote?: string;
  obverseImage?: string;
  reverseImage?: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  hide_images: boolean;
  // The joined banknote data (populated by service layer)
  banknote?: DetailedBanknote;
  personalImages?: string[];
  type?: string;
  prefix?: string;
}

export interface DetailedBanknote {
  id: string;
  catalogId: string;
  extendedPickNumber: string;
  country: string;
  denomination: string;
  year: string;
  series: string;
  description: string;
  obverseDescription: string;
  reverseDescription: string;
  imageUrls: string[];
  isApproved: boolean;
  isPending: boolean;
  createdAt: string;
  updatedAt: string;
  pickNumber?: string;
  turkCatalogNumber?: string;
  sultanName?: string;
  sealNames?: string;
  rarity?: string;
  printer?: string;
  type?: string;
  category?: string;
  islamicYear?: string;
  gregorianYear?: string;
  banknoteDescription?: string;
  historicalDescription?: string;
  serialNumbering?: string;
  securityElement?: string;
  signaturesFront?: string;
  signaturesBack?: string;
  colors?: string;
  watermark?: string;
  dimensions?: string;
  
  // New resolved URL fields from the enhanced view
  signaturesFrontUrls?: string[];
  signaturesBackUrls?: string[];
  sealPictureUrls?: string[];
  watermarkUrl?: string;
  tughraUrl?: string;
  otherElementPictures?: string[];
  // Legacy compatibility properties
  signaturePictureUrls?: string[];
  
  // New authority_name field
  authorityName?: string;

  // New watermarked and thumbnail image fields
  frontPictureWatermarked?: string;
  backPictureWatermarked?: string;
  frontPictureThumbnail?: string;
  backPictureThumbnail?: string;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  banknote_id: string;
  priority: 'Low' | 'Medium' | 'High';
  note?: string;
  created_at: string;
}

export interface MarketplaceItem {
  id: string;
  seller_id: string;
  collection_item_id: string;
  banknote_id: string;
  status: 'Available' | 'Sold' | 'Reserved';
  created_at: string;
  updated_at: string;
  // Additional properties returned by the service
  collectionItemId?: string;
  collectionItem?: CollectionItem;
  sellerId?: string;
  seller?: User;
  createdAt?: string;
  updatedAt?: string;
}

export interface Country {
  id: string;
  name: string;
  name_ar?: string;
  name_tr?: string;
  description?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ForumPost {
  id: string;
  title: string;
  title_ar?: string;
  title_tr?: string;
  content: string;
  content_ar?: string;
  content_tr?: string;
  author_id: string;
  image_urls?: string[];
  created_at: string;
  updated_at: string;
}

export interface ForumComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  content_ar?: string;
  content_tr?: string;
  created_at: string;
  updated_at: string;
  is_edited?: boolean;
}

// Re-export everything from banknote.ts
export * from './banknote';
