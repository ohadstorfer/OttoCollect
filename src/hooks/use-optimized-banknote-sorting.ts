import { useMemo } from 'react';
import { DetailedBanknote } from '@/types';

interface CurrencyDefinition {
  id: string;
  name: string;
  symbol: string;
  display_order: number;
}

interface SortingOptions {
  banknotes: DetailedBanknote[];
  currencies: CurrencyDefinition[];
  sortFields: string[];
}

// Optimized sorting with memoization and efficient comparisons
export const useOptimizedBanknoteSorting = ({ 
  banknotes, 
  currencies, 
  sortFields 
}: SortingOptions): DetailedBanknote[] => {
  // Create currency order map for O(1) lookups
  const currencyOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    currencies.forEach(currency => {
      map.set(currency.name.toLowerCase(), currency.display_order);
    });
    return map;
  }, [currencies]);

  // Memoized parsing functions for better performance
  const parseExtendedPickNumber = useMemo(() => {
    const cache = new Map<string, { base: number; letter: string; suffix: number }>();
    
    return (pickNumber: string) => {
      if (cache.has(pickNumber)) {
        return cache.get(pickNumber)!;
      }
      
      const match = pickNumber.match(/^(\d+)([A-Za-z]?)(\d*)$/);
      const result = {
        base: match ? parseInt(match[1], 10) : 0,
        letter: match ? match[2] : '',
        suffix: match && match[3] ? parseInt(match[3], 10) : 0
      };
      
      cache.set(pickNumber, result);
      return result;
    };
  }, []);

  const parseNumericValue = useMemo(() => {
    const cache = new Map<string, number>();
    
    return (value: string) => {
      if (cache.has(value)) {
        return cache.get(value)!;
      }
      
      const numericPart = value.replace(/[^\d.]/g, '');
      const result = numericPart ? parseFloat(numericPart) : 0;
      
      cache.set(value, result);
      return result;
    };
  }, []);

  return useMemo(() => {
    console.log('useOptimizedBanknoteSorting: Starting sort with', { 
      banknoteCount: banknotes.length, 
      sortFields, 
      currencyCount: currencies.length 
    });
    
    if (!banknotes.length || !sortFields.length) {
      console.log('useOptimizedBanknoteSorting: Early return - no banknotes or sort fields');
      return banknotes;
    }

    // Create optimized comparison function
    const sortedBanknotes = [...banknotes].sort((a, b) => {
      for (const field of sortFields) {
        let comparison = 0;

        switch (field) {
          case 'extPick': {
            const aExtPick = parseExtendedPickNumber(a.extendedPickNumber || '');
            const bExtPick = parseExtendedPickNumber(b.extendedPickNumber || '');
            
            comparison = aExtPick.base - bExtPick.base;
            if (comparison === 0) {
              comparison = aExtPick.letter.localeCompare(bExtPick.letter);
            }
            if (comparison === 0) {
              comparison = aExtPick.suffix - bExtPick.suffix;
            }
            break;
          }
          
          case 'faceValue': {
            // Match the exact logic from useBanknoteSorting
            const getCurrencyInfo = (note: DetailedBanknote) => {
              const denomination = note.denomination?.toLowerCase() || '';
              return currencies.find(c =>
                denomination.includes(c.name.toLowerCase())
              );
            };

            const currencyA = getCurrencyInfo(a);
            const currencyB = getCurrencyInfo(b);

            const extractNumericValue = (value: string) => {
              const match = value.match(/(\d+(\.\d+)?)/); // Same regex as working version
              return match ? parseFloat(match[0]) : 0;
            };

            const valueA = extractNumericValue(a.denomination || '');
            const valueB = extractNumericValue(b.denomination || '');

            if (currencyA && currencyB) {
              comparison = currencyA.display_order - currencyB.display_order;
              if (comparison === 0) { // If same currency display_order, sort by numeric value
                comparison = valueA - valueB;
              }
            } else if (currencyA) { // Only A has a recognized currency
              comparison = -1; // A comes before B
            } else if (currencyB) { // Only B has a recognized currency
              comparison = 1;  // B comes before A
            } else { // Neither has a recognized currency, fallback to numeric value sort
              comparison = valueA - valueB;
            }
            break; // Crucial break
          }
          
          case 'year': {
            const aYear = parseInt(a.year || '0', 10);
            const bYear = parseInt(b.year || '0', 10);
            comparison = aYear - bYear;
            break;
          }
          
          case 'currency': {
            const aCurrencyOrder = currencyOrderMap.get((a.denomination || '').toLowerCase()) || 999;
            const bCurrencyOrder = currencyOrderMap.get((b.denomination || '').toLowerCase()) || 999;
            comparison = aCurrencyOrder - bCurrencyOrder;
            break;
          }
          
          case 'sultan': {
            comparison = (a.sultanName || '').localeCompare(b.sultanName || '');
            break;
          }
          
          default:
            // Handle dynamic sort fields
            comparison = ((a as any)[field] || '').toString().localeCompare(((b as any)[field] || '').toString());
        }

        if (comparison !== 0) {
          return comparison;
        }
      }

      return 0;
    });

    console.log('useOptimizedBanknoteSorting: Completed sort, sample results:', {
      firstThree: sortedBanknotes.slice(0, 3).map(b => ({ 
        id: b.id, 
        extPick: b.extendedPickNumber, 
        denomination: b.denomination,
        sultanName: b.sultanName 
      })),
      sortFields
    });

    return sortedBanknotes;
  }, [banknotes, currencies, sortFields, currencyOrderMap, parseExtendedPickNumber]);
};