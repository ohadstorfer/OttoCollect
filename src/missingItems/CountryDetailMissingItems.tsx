
import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { fetchBanknotesByCountryId } from "@/services/banknoteService";
import { fetchUserCollection } from "@/services/collectionService";
import BanknoteGroupsMissingItems from "./BanknoteGroupsMissingItems";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

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
  const { data: allBanknotes, isLoading: allLoading, error: allError } = useQuery({
    queryKey: ['country-banknotes', countryId],
    queryFn: () => fetchBanknotesByCountryId(countryId),
    enabled: !!countryId,
  });

  // Fetch user's collection (filtering for this country)
  const { data: collection, isLoading: collLoading, error: collError } = useQuery({
    queryKey: ['user-collection', userId, countryId],
    queryFn: () => fetchUserCollection(userId),
    enabled: !!userId && !!countryId,
    select: (items) => items.filter(
      item =>
        item.banknote &&
        item.banknote.country &&
        countryName &&
        item.banknote.country.trim().toLowerCase() === countryName.trim().toLowerCase()
    ),
  });

  if (allLoading || collLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-ottoman-600" />
      </div>
    );
  }

  if (allError || collError) {
    return (
      <div className="text-center py-8">
        <h3 className="text-xl font-medium mb-4 text-red-500">Error loading data</h3>
        <p className="text-muted-foreground mb-6">Failed to load banknote or collection data.</p>
      </div>
    );
  }

  // Calculate missing banknotes: in allBanknotes, not in user's collection
  const userBanknoteIds = new Set((collection || []).map(item => String(item.banknoteId)));
  const missingBanknotes = (allBanknotes || []).filter(banknote => !userBanknoteIds.has(String(banknote.id)));

  if (!missingBanknotes.length) {
    return (
      <Card className="p-8 text-center">
        <h3 className="text-xl font-medium mb-4">No Missing Banknotes</h3>
        <p className="text-muted-foreground mb-6">
          Congratulations! You've collected all banknotes from this country.
        </p>
      </Card>
    );
  }

  return (
    <BanknoteGroupsMissingItems banknotes={missingBanknotes} countryName={countryName} />
  );
};

export default CountryDetailMissingItems;
