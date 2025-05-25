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


      // Apply sorts based on requested fields
      for (const fieldName of sortFields) {
        let comparison = 0;

        switch (fieldName) {
          case "sultan":
            comparison = (a.sultanName || "").localeCompare(b.sultanName || "");
            break;

          case "extPick": {
            // Helper to parse the extended pick number
            const parseExtPick = (pick: string) => {
              const regex = /^(\d+)([A-Za-z])?(\d+)?([A-Za-z]*)?$/;
              const match = (pick || '').match(regex);
              if (!match) {
                return {
                  base_num: 0,
                  letter_type: null,
                  letter_value: null,
                  suffix_num: 0,
                  trailing_text: ''
                };
              }
              const base_num = parseInt(match[1], 10);
              const letter_value = match[2] || null;
              const letter_type = letter_value
                ? (letter_value === letter_value.toUpperCase() ? 'capital' : 'lowercase')
                : null;
              const suffix_num = match[3] ? parseInt(match[3], 10) : 0;
              const trailing_text = match[4] || '';
              return {
                base_num,
                letter_type,
                letter_value,
                suffix_num,
                trailing_text
              };
            };

            const aPick = parseExtPick(a.extendedPickNumber || a.catalogId || '');
            const bPick = parseExtPick(b.extendedPickNumber || b.catalogId || '');

            // Sort by base_num
            if (aPick.base_num !== bPick.base_num) {
              return aPick.base_num - bPick.base_num;
            }
            // Sort by letter_type: null < capital < lowercase
            const letterTypeOrder = { null: 0, capital: 1, lowercase: 2 };
            if (letterTypeOrder[aPick.letter_type || 'null'] !== letterTypeOrder[bPick.letter_type || 'null']) {
              return letterTypeOrder[aPick.letter_type || 'null'] - letterTypeOrder[bPick.letter_type || 'null'];
            }
            // Sort by letter_value
            if ((aPick.letter_value || '') !== (bPick.letter_value || '')) {
              return (aPick.letter_value || '').localeCompare(bPick.letter_value || '');
            }
            // Sort by suffix_num
            if (aPick.suffix_num !== bPick.suffix_num) {
              return aPick.suffix_num - bPick.suffix_num;
            }
            // Sort by trailing_text
            if ((aPick.trailing_text || '') !== (bPick.trailing_text || '')) {
              return (aPick.trailing_text || '').localeCompare(bPick.trailing_text || '');
            }
            return 0;
          }

          case "faceValue":

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

            // Apply face value sorting if explicitly requested
            const extractNumericValue = (value: string) => {
              const match = value.match(/(\\d+(\\.\\d+)?)/);
              return match ? parseFloat(match[0]) : 0;
            };

            const valueA = extractNumericValue(a.denomination || '');
            const valueB = extractNumericValue(b.denomination || '');

            // Always sort by currency display order first, then numeric value
            if (currencyA && currencyB) {
              const orderDiff = currencyA.display_order - currencyB.display_order;
              if (orderDiff !== 0) return orderDiff;
              // If same currency, sort by value
              return valueA - valueB;
            } else {
              // If currency not found, fallback to value sort
              return valueA - valueB;
            }

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
