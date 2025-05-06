
import { useMemo } from 'react';
import { DetailedBanknote } from '@/types';
import { Currency } from '@/types/banknote';
import { BanknoteCondition } from '@/types';

interface UseBanknoteSortingProps {
  banknotes: (DetailedBanknote | any)[];
  currencies: Currency[];
  sortFields: string[];
}

export const useBanknoteSorting = ({ banknotes, currencies, sortFields }: UseBanknoteSortingProps) => {
  return useMemo(() => {
    if (!banknotes?.length) return [];
    
    return [...banknotes].sort((a, b) => {
      // Get currency info for both banknotes
      const getCurrencyInfo = (note: DetailedBanknote | any) => {
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
      
      // Apply sorts based on requested fields
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
            // Apply face value sorting if explicitly requested
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
            
          case "condition":
            // Sort by condition (for collection items)
            if (a.collectionData?.condition && b.collectionData?.condition) {
              const conditionOrder: Record<BanknoteCondition, number> = {
                'UNC': 1,
                'AU': 2,
                'XF': 3,
                'VF': 4,
                'F': 5,
                'VG': 6,
                'G': 7,
                'Fair': 8,
                'Poor': 9
              };
              const conditionA = conditionOrder[a.collectionData.condition as BanknoteCondition] || 10;
              const conditionB = conditionOrder[b.collectionData.condition as BanknoteCondition] || 10;
              comparison = conditionA - conditionB;
            }
            break;
            
          case "purchaseDate":
            // Sort by purchase date (for collection items)
            if (a.collectionData?.purchaseDate && b.collectionData?.purchaseDate) {
              const dateA = new Date(a.collectionData.purchaseDate).getTime();
              const dateB = new Date(b.collectionData.purchaseDate).getTime();
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
