
import { useMemo } from 'react';
import { DetailedBanknote } from '@/types';
import { Currency } from '@/types/banknote';

interface UseBanknoteSortingProps {
  banknotes: DetailedBanknote[];
  currencies: Currency[];
  sortFields: string[];
}

export const useBanknoteSorting = ({ banknotes, currencies, sortFields }: UseBanknoteSortingProps) => {
  return useMemo(() => {
    if (!banknotes?.length) return [];
    
    return [...banknotes].sort((a, b) => {
      // Get currency info for both banknotes
      const getCurrencyInfo = (note: DetailedBanknote) => {
        const denomination = note.denomination?.toLowerCase() || '';
        return currencies.find(c => 
          denomination.includes(c.name.toLowerCase())
        );
      };

      const currencyA = getCurrencyInfo(a);
      const currencyB = getCurrencyInfo(b);

      // Sort by currency display order first
      if (currencyA && currencyB) {
        const orderDiff = currencyA.display_order - currencyB.display_order;
        if (orderDiff !== 0) return orderDiff;
      }

      // We don't need to sort by face value explicitly here, as the banknotes are 
      // already pre-sorted by the extended_pick_number in the database, which 
      // inherently sorts by the numeric value correctly
      
      // Only apply additional sorts if they are specifically requested
      for (const fieldName of sortFields) {
        let comparison = 0;

        switch (fieldName) {
          case "sultan":
            comparison = (a.sultanName || "").localeCompare(b.sultanName || "");
            break;

          case "extPick":
            // No need for custom sorting here as data should already be sorted by the database
            comparison = 0;
            break;
            
          case "faceValue":
            // Apply face value sorting only if explicitly requested
            const extractNumericValue = (value: string) => {
              const match = value.match(/(\d+(\.\d+)?)/);
              return match ? parseFloat(match[0]) : 0;
            };

            const valueA = extractNumericValue(a.denomination || '');
            const valueB = extractNumericValue(b.denomination || '');
            
            comparison = valueA - valueB;
            break;
            
          case "newest":
            if ('createdAt' in a && 'createdAt' in b) {
              const dateA = new Date(a.createdAt).getTime();
              const dateB = new Date(b.createdAt).getTime();
              comparison = dateB - dateA;
            }
            break;
        }

        if (comparison !== 0) return comparison;
      }

      return 0;
    });
  }, [banknotes, currencies, sortFields]);
};
