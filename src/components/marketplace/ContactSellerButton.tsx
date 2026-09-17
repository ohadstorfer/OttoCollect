
import React from 'react';
import { ContactSeller } from '@/components/messages/ContactSeller';
import { MarketplaceItem } from '@/types';
import { formatReferenceCode } from '@/lib/marketplaceListing';

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
  const initialMessage = buildContactDraft(item);

  return (
    <ContactSeller
      sellerId={item.sellerId}
      sellerName={item.seller.username}
      itemId={item.id}
      itemName={itemName}
      initialMessage={initialMessage}
      buttonClassName={buttonClassName}
      buttonVariant={buttonVariant}
      buttonSize={buttonSize}
      hideIcon={hideIcon}
    />
  );
}

/**
 * Opening line for a buyer's message, e.g. "20 kurus (p80a) Ref: B 2026 09 00001",
 * followed by a newline so the buyer writes underneath (client remark 8.1, messages §1).
 */
export function buildContactDraft(item: MarketplaceItem): string {
  const banknote = item.collectionItem.banknote as MarketplaceItem['collectionItem']['banknote'] & {
    newExtendedPickNumber?: string;
  };
  const pick = banknote.newExtendedPickNumber || banknote.extendedPickNumber;
  const ref = formatReferenceCode(item.reference_code);
  const parts = [
    banknote.denomination,
    pick ? `(${pick})` : null,
    ref ? `Ref: ${ref}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? `${parts.join(' ')}\n` : '';
}
