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
              const regex = /^(\d+)(.*)$/; // Changed to capture everything after the initial number
              const match = (pick || "").match(regex);
          
              if (!match) {
                return {
                  base_num: 0,
                  raw_suffix: "",
                };
              }
          
              const base_num = parseInt(match[1], 10);
              const raw_suffix = match[2] || "";
              return { base_num, raw_suffix };
            };
          
            const classifySuffix = (suffix: string) => {
              if (!suffix) {
                return { group: 0, rank: 0, raw: "" }; // no suffix
              }
          
              // lowercase (including mixed alphanumeric like "a1", "c1")
              if (/^[a-z]+(\d+)?$/.test(suffix)) {
                const letterPart = suffix.match(/^[a-z]+/)?.[0] || "";
                const numberPart = suffix.match(/\d+$/)?.[0] || "";
                
                if (suffix.length === 1) {
                  // Single lowercase letter like "a", "b", "c"
                  return { group: 1, rank: letterPart.charCodeAt(0) * 1000, raw: suffix };
                } else if (numberPart) {
                  // Mixed alphanumeric like "a1", "c1" - should come right after the base letter
                  const numValue = parseInt(numberPart, 10);
                  return { group: 1, rank: letterPart.charCodeAt(0) * 1000 + numValue, raw: suffix };
                } else {
                  // Multi-letter lowercase like "aa", "ab"
                  return { group: 2, rank: letterPart.charCodeAt(0), raw: suffix };
                }
              }
          
              // uppercase
              if (/^[A-Z]+$/.test(suffix)) {
                if (suffix.length === 1) {
                  return { group: 3, rank: suffix.charCodeAt(0), raw: suffix }; // single uppercase
                } else {
                  return { group: 4, rank: suffix.charCodeAt(0), raw: suffix }; // multi-letter uppercase (Abs…)
                }
              }
          
              // mixed-case like "Abs" -> treat as uppercase extended
              if (/^[A-Z][a-zA-Z]*$/.test(suffix)) {
                return { group: 4, rank: suffix.charCodeAt(0), raw: suffix };
              }
          
              // fallback
              return { group: 5, rank: 0, raw: suffix };
            };
          
            const aPick = parseExtPick(a.extendedPickNumber || a.catalogId || "");
            const bPick = parseExtPick(b.extendedPickNumber || b.catalogId || "");
          
            if (aPick.base_num !== bPick.base_num) {
              comparison = aPick.base_num - bPick.base_num;
            } else {
              const aClass = classifySuffix(aPick.raw_suffix);
              const bClass = classifySuffix(bPick.raw_suffix);
          
              // Compare groups first
              if (aClass.group !== bClass.group) {
                comparison = aClass.group - bClass.group;
              } else if (aClass.rank !== bClass.rank) {
                comparison = aClass.rank - bClass.rank;
              } else {
                // tie-breaker: full string compare
                comparison = aClass.raw.localeCompare(bClass.raw);
              }
            }
          
            break;
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
