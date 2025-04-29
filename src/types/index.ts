
// Remove duplicate isRead declaration and consolidate
export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  isRead: boolean;
  reference_item_id?: string;
  
  // Alias properties for compatibility
  senderId?: string;
  receiverId?: string;
  createdAt?: string;
}

export interface Role {
  id: string;
  name: string;
  created_at: string;
}

// Add explicit UserRank type
export type UserRank = 
  | 'Newbie' 
  | 'Bronze' 
  | 'Silver' 
  | 'Gold' 
  | 'Platinum' 
  | 'Super Collector'
  | 'Beginner Collector'
  | 'Casual Collector'
  | 'Known Collector'
  | 'Advance Collector'
  | 'Expert'
  | 'Master'
  | 'Grandmaster'
  | 'Admin'
  | 'Super Admin';

// Update UserRole type to allow any string since roles are now dynamic
export type UserRole = string;

// Add interface for country admin assignment
export interface CountryAdminAssignment {
  id: string;
  user_id: string;
  country_id: string;
  created_at: string;
}

// Re-export types from other files
export * from './banknote';
export * from './collection';
export * from './user';
export * from './message';
export * from './forum';
export * from './filter';
export * from './wishlist';

// Add CountryData type
export interface CountryData {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string | null;
  banknoteCount?: number;
  created_at?: string;
  updated_at?: string;
}
