
import React from 'react';
import { ContactSeller } from '@/components/messages/ContactSeller';
import { MarketplaceItem } from '@/types';

interface ContactSellerButtonProps {
  item: MarketplaceItem;
}

export function ContactSellerButton({ item }: ContactSellerButtonProps) {
  // Create a descriptive name for the banknote
  const itemName = `${item.collectionItem.banknote.country} ${item.collectionItem.banknote.denomination} (${item.collectionItem.banknote.year})`;
  
  return (
    <ContactSeller 
      sellerId={item.sellerId}
      sellerName={item.seller.username}
      itemId={item.id}
      itemName={itemName}
    />
  );
}
