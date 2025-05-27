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

    return [...banknotes].sort((a, b) => {
      // Apply sorts based on effective (potentially reordered) fields
      for (const fieldName of effectiveSortFields) {
        let comparison = 0;

        switch (fieldName) {
          case "sultan":
            comparison = (a.sultanName || "").localeCompare(b.sultanName || "");
            break;

          // Step 1: Corrected faceValue case
          case "faceValue": {
            const getCurrencyInfo = (note: DetailedBanknote | any) => {
              const denomination = note.denomination?.toLowerCase() || '';
              return currencies.find(c =>
                denomination.includes(c.name.toLowerCase())
              );
            };

            const currencyA = getCurrencyInfo(a);
            const currencyB = getCurrencyInfo(b);

            const extractNumericValue = (value: string) => {
              const match = value.match(/(\d+(\.\d+)?)/); // Corrected regex
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

          // Step 1: Corrected extPick case
          case "extPick": {
            const parseExtPick = (pick: string) => {
              const regex = /^(\d+)([A-Za-z])?(\d+)?([A-Za-z]*)?$/;
              const match = (pick || '').match(regex);
              if (!match) {
                return { base_num: 0, letter_type: null, letter_value: null, suffix_num: 0, trailing_text: '' };
              }
              const base_num = parseInt(match[1], 10);
              const letter_value = match[2] || null;
              const letter_type = letter_value ? (letter_value === letter_value.toUpperCase() ? 'capital' : 'lowercase') : null;
              const suffix_num = match[3] ? parseInt(match[3], 10) : 0;
              const trailing_text = match[4] || '';
              return { base_num, letter_type, letter_value, suffix_num, trailing_text };
            };

            const aPick = parseExtPick(a.extendedPickNumber || a.catalogId || '');
            const bPick = parseExtPick(b.extendedPickNumber || b.catalogId || '');

            if (aPick.base_num !== bPick.base_num) {
              comparison = aPick.base_num - bPick.base_num;
            } else {
              const letterTypeOrder = { null: 0, capital: 1, lowercase: 2 };
              const typeAOrder = letterTypeOrder[aPick.letter_type || 'null'] || 0;
              const typeBOrder = letterTypeOrder[bPick.letter_type || 'null'] || 0;

              if (typeAOrder !== typeBOrder) {
                comparison = typeAOrder - typeBOrder;
              } else if ((aPick.letter_value || '') !== (bPick.letter_value || '')) {
                comparison = (aPick.letter_value || '').localeCompare(bPick.letter_value || '');
              } else if (aPick.suffix_num !== bPick.suffix_num) {
                comparison = aPick.suffix_num - bPick.suffix_num;
              } else if ((aPick.trailing_text || '') !== (bPick.trailing_text || '')) {
                comparison = (aPick.trailing_text || '').localeCompare(bPick.trailing_text || '');
              } else {
                comparison = 0; // All parts are equal
              }
            }
            break; // Crucial break
          }

          case "newest":
            if ('createdAt' in a && 'createdAt' in b) {
              const dateA = new Date(a.createdAt).getTime();
              const dateB = new Date(b.createdAt).getTime();
              comparison = dateB - dateA; // newest first
            }
            break;

          
        }

        if (comparison !== 0) {
          return comparison; // This field determined the order
        }
      }

      return 0; // All requested sort fields resulted in a tie
    });
  }, [banknotes, currencies, sortFields]);
};