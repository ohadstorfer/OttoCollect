
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchBanknotesByCountryId } from '@/services/banknoteService';
import { fetchUserCollection } from '@/services/collectionService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import BanknoteDetailCardMissingItems from '@/components/banknotes/BanknoteDetailCardMissingItems';

interface CountryDetailMissingItemsProps {
  userId: string;
  countryId: string;
  countryName: string;
}

const CountryDetailMissingItems: React.FC<CountryDetailMissingItemsProps> = ({
  userId,
  countryId,
  countryName
}) => {
  // Fetch all banknotes for the country
  const {
    data: allBanknotes,
    isLoading: banknotesLoading,
    error: banknotesError
  } = useQuery({
    queryKey: ['country-banknotes', countryId],
    queryFn: () => fetchBanknotesByCountryId(countryId),
    enabled: !!countryId
  });

  // Fetch user's collection for this country
  const {
    data: userCollection,
    isLoading: collectionLoading,
    error: collectionError,
    refetch
  } = useQuery({
    queryKey: ['user-collection', userId, countryId],
    queryFn: () => fetchUserCollection(userId),
    enabled: !!userId && !!countryId,
    select: (data) => data.filter(item => item.banknote?.country === countryName)
  });

  // Calculate missing banknotes
  const missingBanknotes = React.useMemo(() => {
    if (!allBanknotes || !userCollection) return [];
    const userBanknoteIds = new Set(userCollection.map(item => item.banknoteId));
    return allBanknotes.filter(banknote => !userBanknoteIds.has(banknote.id));
  }, [allBanknotes, userCollection]);

  if (banknotesLoading || collectionLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-ottoman-600" />
      </div>
    );
  }

  if (banknotesError || collectionError) {
    return (
      <div className="text-center py-8">
        <h3 className="text-xl font-medium mb-4 text-red-500">Error loading data</h3>
        <p className="text-muted-foreground mb-6">Failed to load banknotes data.</p>
      </div>
    );
  }

  if (!missingBanknotes || missingBanknotes.length === 0) {
    return (
      <Card className="p-8 text-center">
        <h3 className="text-xl font-medium mb-4">No Missing Banknotes</h3>
        <p className="text-muted-foreground mb-6">
          {"Congratulations! You've collected all banknotes from this country."}
        </p>
      </Card>
    );
  }

  return (
    <div className="page-container max-w-5xl mx-auto">
      <h3 className="text-xl font-medium mb-4">Missing Banknotes ({missingBanknotes.length})</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {missingBanknotes.map(banknote => (
          <BanknoteDetailCardMissingItems
            key={banknote.id}
            banknote={banknote}
            onDeleted={refetch}
            source="catalog"
          />
        ))}
      </div>
    </div>
  );
};

export default CountryDetailMissingItems;
