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
    const cache = new Map<string, { base: number; letters: string; suffix: number; sortKey: string }>();
    
    return (pickNumber: string) => {
      if (cache.has(pickNumber)) {
        return cache.get(pickNumber)!;
      }
      
      // Enhanced regex to handle complex formats like 31As, 32Aas, 21a1, etc.
      // First capture the number, then all letters, then any trailing number
      const match = pickNumber.match(/^(\d+)([A-Za-z]*)(\d*)$/);
      
      if (match) {
        const base = parseInt(match[1], 10);
        const letters = match[2] || '';
        const suffix = match[3] ? parseInt(match[3], 10) : 0;
        
        // Create a sort key that properly orders complex pick numbers
        // Convert letters to lowercase for consistent sorting
        const normalizedLetters = letters.toLowerCase();
        
        // Create a sort key: base number + padded letters + suffix
        const sortKey = `${base.toString().padStart(6, '0')}-${normalizedLetters.padEnd(5, 'z')}-${suffix.toString().padStart(6, '0')}`;
        
        const result = {
          base,
          letters: normalizedLetters,
          suffix,
          sortKey
        };
        
        cache.set(pickNumber, result);
        return result;
      }
      
      // Fallback for invalid formats
      const result = {
        base: 0,
        letters: '',
        suffix: 0,
        sortKey: '000000-zzzzz-000000'
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
      
      // Use the same regex as the working implementation
      const match = value.match(/(\d+(\.\d+)?)/);
      const result = match ? parseFloat(match[0]) : 0;
      
      cache.set(value, result);
      return result;
    };
  }, []);

  return useMemo(() => {
    if (!banknotes.length || !sortFields.length) {
      return banknotes;
    }

    // Step 2: Create effectiveSortFields to prioritize faceValue if present
    let effectiveSortFields = [...sortFields];
    if (sortFields.includes('faceValue')) {
      effectiveSortFields = [
        'faceValue',
        ...sortFields.filter(sf => sf !== 'faceValue'),
      ];
    }
    // Ensure no duplicates if 'faceValue' was already first
    effectiveSortFields = [...new Set(effectiveSortFields)];

    // Create optimized comparison function
    const sortedBanknotes = [...banknotes].sort((a, b) => {
      // Apply sorts based on effective (potentially reordered) fields
      for (const field of effectiveSortFields) {
        let comparison = 0;

        switch (field) {
          case 'extPick': {
            const aExtPick = parseExtendedPickNumber(a.extendedPickNumber || '');
            const bExtPick = parseExtendedPickNumber(b.extendedPickNumber || '');
            
            // Use the sort key for proper ordering of complex pick numbers
            comparison = aExtPick.sortKey.localeCompare(bExtPick.sortKey);
            break;
          }
          
          case 'faceValue': {
            console.log('🎯 Optimized Sorting: Processing faceValue sort', { 
              a: a.denomination, 
              b: b.denomination,
              currencies: currencies.length 
            });
            
            const getCurrencyInfo = (note: DetailedBanknote) => {
              const denomination = note.denomination?.toLowerCase() || '';
              return currencies.find(c =>
                denomination.includes(c.name.toLowerCase())
              );
            };

            const currencyA = getCurrencyInfo(a);
            const currencyB = getCurrencyInfo(b);

            const aValue = parseNumericValue(a.denomination || '');
            const bValue = parseNumericValue(b.denomination || '');

            console.log('🎯 Optimized Sorting: Currency info', { 
              currencyA: currencyA?.name, 
              currencyB: currencyB?.name,
              aValue, 
              bValue 
            });

            if (currencyA && currencyB) {
              comparison = currencyA.display_order - currencyB.display_order;
              if (comparison === 0) { // If same currency display_order, sort by numeric value
                comparison = aValue - bValue;
              }
            } else if (currencyA) { // Only A has a recognized currency
              comparison = -1; // A comes before B
            } else if (currencyB) { // Only B has a recognized currency
              comparison = 1;  // B comes before A
            } else { // Neither has a recognized currency, fallback to numeric value sort
              comparison = aValue - bValue;
            }
            
            console.log('🎯 Optimized Sorting: Final comparison', { comparison });
            break;
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

    return sortedBanknotes;
  }, [banknotes, currencies, sortFields]);
};