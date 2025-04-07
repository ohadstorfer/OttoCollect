
import React from 'react';
import { ContactSeller } from '@/components/messages/ContactSeller';
import { MarketplaceItem } from '@/types/marketplace';

interface ContactSellerButtonProps {
  item: MarketplaceItem;
}

export function ContactSellerButton({ item }: ContactSellerButtonProps) {
  // Check if collectionItem and seller are available
  if (!item.collectionItem || !item.seller) {
    return null;
  }
  
  // Create a descriptive name for the banknote
  const itemName = `${item.collectionItem.banknote?.country || ''} ${item.collectionItem.banknote?.denomination || ''} (${item.collectionItem.banknote?.year || ''})`;
  
  return (
    <ContactSeller 
      sellerId={item.sellerId}
      sellerName={item.seller.username}
      itemId={item.id}
      itemName={itemName}
    />
  );
}
