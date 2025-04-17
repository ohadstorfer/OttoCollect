
import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { MarketplaceItem } from '@/types';

interface ContactSellerButtonProps {
  item: MarketplaceItem;
}

export function ContactSellerButton({ item }: ContactSellerButtonProps) {
  const handleContactSeller = () => {
    // Logic to contact seller would go here
    console.log(`Contacting seller for item: ${item.id}`);
  };
  
  return (
    <Button 
      size="sm" 
      variant="secondary"
      onClick={handleContactSeller}
    >
      <MessageCircle className="h-4 w-4 mr-1" />
      Contact
    </Button>
  );
}
