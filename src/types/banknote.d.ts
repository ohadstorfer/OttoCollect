export interface Currency {
  id: string;
  name: string;
  country_id: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface BanknoteDetailCardProps {
  banknote: DetailedBanknote;
  source?: "marketplace" | "collection" | "catalog" | "wishlist";
  onClick?: () => void;
  selected?: boolean;
  compact?: boolean;
  hideStatus?: boolean;
  viewMode?: 'grid' | 'list';
}
