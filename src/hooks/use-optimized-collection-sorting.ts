import { useMemo } from 'react';
import { CollectionItem } from '@/types';

interface CollectionSortingOptions {
  collectionItems: CollectionItem[];
  sortFields: string[];
}

export const useOptimizedCollectionSorting = ({ 
  collectionItems, 
  sortFields 
}: CollectionSortingOptions): CollectionItem[] => {
  // Create currency order map for O(1) lookups (collection items don't use currencies directly)
  const currencyOrderMap = useMemo(() => new Map<string, number>(), []);

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
    if (!collectionItems.length || !sortFields.length) {
      return collectionItems;
    }

    // Create optimized comparison function
    const sortedItems = [...collectionItems].sort((a, b) => {
      for (const sortField of sortFields) {
        let comparison = 0;
        
        switch (sortField) {
          case 'extPick':
            const aPickNumber = a.banknote?.extendedPickNumber || '';
            const bPickNumber = b.banknote?.extendedPickNumber || '';
            
            if (aPickNumber && bPickNumber) {
              const aParsed = parseExtendedPickNumber(aPickNumber);
              const bParsed = parseExtendedPickNumber(bPickNumber);
              
              comparison = aParsed.base - bParsed.base;
              if (comparison === 0) {
                comparison = aParsed.letter.localeCompare(bParsed.letter);
                if (comparison === 0) {
                  comparison = aParsed.suffix - bParsed.suffix;
                }
              }
            } else {
              comparison = aPickNumber.localeCompare(bPickNumber);
            }
            break;
            
          case 'denomination':
            const aDenom = a.banknote?.denomination || '';
            const bDenom = b.banknote?.denomination || '';
            const aNum = parseNumericValue(aDenom);
            const bNum = parseNumericValue(bDenom);
            comparison = aNum - bNum;
            break;
            
          case 'year':
            const aYear = a.banknote?.year || '';
            const bYear = b.banknote?.year || '';
            comparison = aYear.localeCompare(bYear);
            break;
            
          case 'category':
            const aCategory = a.banknote?.category || '';
            const bCategory = b.banknote?.category || '';
            comparison = aCategory.localeCompare(bCategory);
            break;
            
          case 'type':
            const aType = a.banknote?.type || '';
            const bType = b.banknote?.type || '';
            comparison = aType.localeCompare(bType);
            break;
            
          case 'condition':
            const aCondition = a.condition || '';
            const bCondition = b.condition || '';
            comparison = aCondition.localeCompare(bCondition);
            break;
            
          case 'grade':
            const aGrade = a.grade || '';
            const bGrade = b.grade || '';
            comparison = aGrade.localeCompare(bGrade);
            break;
            
          case 'purchasePrice':
            const aPurchasePrice = a.purchasePrice || 0;
            const bPurchasePrice = b.purchasePrice || 0;
            comparison = aPurchasePrice - bPurchasePrice;
            break;
            
          case 'salePrice':
            const aSalePrice = a.salePrice || 0;
            const bSalePrice = b.salePrice || 0;
            comparison = aSalePrice - bSalePrice;
            break;
            
          case 'purchaseDate':
            const aPurchaseDate = a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0;
            const bPurchaseDate = b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0;
            comparison = aPurchaseDate - bPurchaseDate;
            break;
            
          case 'addedDate':
            const aAddedDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bAddedDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            comparison = aAddedDate - bAddedDate;
            break;
            
          default:
            // Handle any other sorting fields by comparing string values
            const aValue = (a.banknote as any)?.[sortField] || '';
            const bValue = (b.banknote as any)?.[sortField] || '';
            comparison = String(aValue).localeCompare(String(bValue));
        }
        
        if (comparison !== 0) {
          return comparison;
        }
      }
      
      return 0;
    });

    console.log(`[OptimizedCollectionSorting] Sorted ${sortedItems.length} items by [${sortFields.join(', ')}]`);
    return sortedItems;
  }, [collectionItems, sortFields, parseExtendedPickNumber, parseNumericValue]);
};