
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchUserCollection } from '@/services/collectionService';
import { fetchBanknotes } from '@/services/banknoteService';
import { CollectionItem } from '@/types';
import CollectionItemCard from '@/components/collection/CollectionItemCard';

interface ProfileCollectionProps {
  userId: string;
}

const ProfileCollection = ({ userId }: ProfileCollectionProps) => {
  const [collection, setCollection] = useState<CollectionItem[] | undefined>([]);
  
  const [filter, setFilter] = useState({
    searchTerm: '',
  });
  
  const handleSearch = (term: string) => {
    setFilter({ searchTerm: term });
  };
  
  const { data: allBanknotes, isLoading: banknotesLoading } = useQuery({
    queryKey: ['banknotes'],
    queryFn: () => fetchBanknotes()
  });
  
  const { data: collectionData, isLoading: collectionLoading } = useQuery({
    queryKey: ['collection', userId],
    queryFn: () => fetchUserCollection(userId),
    enabled: !!userId,
    meta: { onSuccess: (data: CollectionItem[]) => {
      setCollection(data);
    }}
  });
  
  const filteredItems = collection?.filter((item) => {
    const banknote = allBanknotes?.find((b) => b.id === item.banknoteId);
    if (!banknote) return false;
    
    const matchesSearch = 
      banknote.denomination.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
      banknote.country.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
      banknote.year.toLowerCase().includes(filter.searchTerm.toLowerCase());
    
    return matchesSearch;
  }) || [];
  
  if (collectionLoading || banknotesLoading) {
    return <div>Loading collection...</div>;
  }
  
  return (
    <div>
      <input
        type="text"
        placeholder="Search your collection..."
        onChange={(e) => handleSearch(e.target.value)}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredItems.map((item) => {
          const banknote = allBanknotes?.find((b) => b.id === item.banknoteId);
          if (!banknote) return null;
          
          return (
            <CollectionItemCard
              key={item.id}
              item={item}
              banknote={banknote}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ProfileCollection;
