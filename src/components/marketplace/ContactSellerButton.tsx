
import React from 'react';
import { ContactSeller } from '@/components/messages/ContactSeller';
import { MarketplaceItem } from '@/types';

interface ContactSellerButtonProps {
  item: MarketplaceItem;
  buttonClassName?: string;
  buttonVariant?: React.ComponentProps<typeof ContactSeller>['buttonVariant'];
  buttonSize?: React.ComponentProps<typeof ContactSeller>['buttonSize'];
  hideIcon?: boolean;
}

export function ContactSellerButton({
  item,
  buttonClassName,
  buttonVariant,
  buttonSize,
  hideIcon,
}: ContactSellerButtonProps) {
  // Create a descriptive name for the banknote
  const itemName = `${item.collectionItem.banknote.country} ${item.collectionItem.banknote.denomination} (${item.collectionItem.banknote.year})`;

  return (
    <ContactSeller
      sellerId={item.sellerId}
      sellerName={item.seller.username}
      itemId={item.id}
      itemName={itemName}
      buttonClassName={buttonClassName}
      buttonVariant={buttonVariant}
      buttonSize={buttonSize}
      hideIcon={hideIcon}
    />
  );
}
