
import { useMemo } from 'react';
import { DetailedBanknote, Currency } from '@/types';

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

      // Then sort by face value within same currency
      const extractNumericValue = (value: string) => {
        const match = value.match(/(\d+(\.\d+)?)/);
        return match ? parseFloat(match[0]) : 0;
      };

      const valueA = extractNumericValue(a.denomination || '');
      const valueB = extractNumericValue(b.denomination || '');
      
      if (valueA !== valueB) {
        return valueA - valueB;
      }

      // Apply additional sort fields
      for (const fieldName of sortFields) {
        let comparison = 0;

        switch (fieldName) {
          case "sultan":
            comparison = (a.sultanName || "").localeCompare(b.sultanName || "");
            break;

          case "extPick":
            comparison = (a.extendedPickNumber || "").localeCompare(b.extendedPickNumber || "");
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

      // Fallback to catalog number
      return (a.extendedPickNumber || "").localeCompare(b.extendedPickNumber || "");
    });
  }, [banknotes, currencies, sortFields]);
};
