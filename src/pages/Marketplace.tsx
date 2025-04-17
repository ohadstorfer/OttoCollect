import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMarketplaceItems } from '@/services/marketplaceService';
import { MarketplaceItem } from '@/types';
import MarketplaceItemCard from '@/components/marketplace/MarketplaceItemCard';
import { Input } from "@/components/ui/input"

export default function Marketplace() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: marketplaceItems, isLoading, isError } = useQuery({
    queryKey: ['marketplaceItems'],
    queryFn: fetchMarketplaceItems,
  });

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filteredMarketplaceItems = marketplaceItems?.filter((item) => {
    const banknote = item.collectionItem;
    if (!banknote) return false;

    const matchesSearch =
      banknote.banknoteId.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  }) || [];

  if (isLoading) {
    return <div>Loading marketplace items...</div>;
  }

  if (isError) {
    return <div>Error loading marketplace items.</div>;
  }
  
  return (
    <div className="container py-6">
      <h1 className="text-3xl font-semibold mb-4">Marketplace</h1>
      
      <Input
        type="text"
        placeholder="Search by Banknote ID..."
        value={searchTerm}
        onChange={handleSearchChange}
        className="mb-4"
      />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredMarketplaceItems.map((marketplaceItem) => (
          <MarketplaceItemCard 
            key={marketplaceItem.id} 
            marketplaceItem={marketplaceItem} 
          />
        ))}
      </div>
    </div>
  );
}
