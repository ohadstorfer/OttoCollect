
import { DetailedBanknote } from "@/types";

interface BanknoteGroup {
  baseNumber: string;
  items: DetailedBanknote[];
  count: number;
  key: string;
  displayImage: string;
  denomination?: string;
}

/**
 * Groups banknotes based on their extended pick number base.
 * For example: 21a, 21b, 21c all belong to group "21"
 * 21A is a group of itself, and 21Aa, 21Ab belong to group "21A"
 */
export const groupBanknotesByExtendedPick = (banknotes: DetailedBanknote[]): Map<string, BanknoteGroup> => {
  // Create a map to store groups
  const groupsMap = new Map<string, BanknoteGroup>();
  
  // Process each banknote
  banknotes.forEach(banknote => {
    if (!banknote.extendedPickNumber) return;
    
    // Extract the base number using regex
    // This regex will match base numbers like "21" from "21a" or "21A" from "21Aa"
    const baseMatch = banknote.extendedPickNumber.match(/^(\d+[A-Z]?)/);
    const baseNumber = baseMatch ? baseMatch[1] : banknote.extendedPickNumber;
    
    if (!groupsMap.has(baseNumber)) {
      // Initialize a new group
      groupsMap.set(baseNumber, {
        baseNumber,
        items: [banknote],
        count: 1,
        key: `group-${baseNumber}`,
        displayImage: banknote.imageUrls?.[0] || '',
        denomination: banknote.denomination,
      });
    } else {
      // Add banknote to existing group
      const group = groupsMap.get(baseNumber)!;
      group.items.push(banknote);
      group.count++;
      
      // Use the first item's image and denomination if not already set
      if (!group.displayImage && banknote.imageUrls?.[0]) {
        group.displayImage = banknote.imageUrls[0];
      }
      
      if (!group.denomination) {
        group.denomination = banknote.denomination;
      }
    }
  });
  
  return groupsMap;
};

export interface BanknoteGroupData {
  baseNumber: string;
  items: DetailedBanknote[];
  count: number;
}

export const getBanknoteGroupData = (
  banknotes: DetailedBanknote[]
): { singles: DetailedBanknote[]; groups: BanknoteGroupData[] } => {
  const groupsMap = groupBanknotesByExtendedPick(banknotes);
  const singles: DetailedBanknote[] = [];
  const groups: BanknoteGroupData[] = [];
  
  // Process the groups
  groupsMap.forEach((group) => {
    // If the group only has one banknote, treat it as a single
    if (group.count === 1) {
      singles.push(group.items[0]);
    } else {
      groups.push({
        baseNumber: group.baseNumber,
        items: group.items,
        count: group.count,
      });
    }
  });
  
  return { singles, groups };
};

export type MixedBanknoteItem = 
  | { type: 'single'; banknote: DetailedBanknote }
  | { type: 'group'; group: BanknoteGroupData };

/**
 * Returns a mixed array of single banknotes and groups, preserving the original sort order
 * based on the extendedPickNumber. Groups are formed when multiple banknotes share the same
 * base pick number.
 */
export const getMixedBanknoteItems = (banknotes: DetailedBanknote[]): MixedBanknoteItem[] => {
  // First, identify which banknotes belong to groups
  const banknoteMap = new Map<string, DetailedBanknote[]>();
  
  // Group banknotes by their base pick number
  banknotes.forEach(banknote => {
    if (!banknote.extendedPickNumber) return;
    
    // Extract the base number using regex
    const baseMatch = banknote.extendedPickNumber.match(/^(\d+[A-Z]?)/);
    const baseNumber = baseMatch ? baseMatch[1] : banknote.extendedPickNumber;
    
    if (!banknoteMap.has(baseNumber)) {
      banknoteMap.set(baseNumber, [banknote]);
    } else {
      banknoteMap.get(baseNumber)?.push(banknote);
    }
  });
  
  // Process the banknotes in their original order to maintain sort order
  const mixedItems: MixedBanknoteItem[] = [];
  const processedBaseNumbers = new Set<string>();
  
  for (const banknote of banknotes) {
    if (!banknote.extendedPickNumber) {
      // Just add banknotes without pick numbers as singles
      mixedItems.push({ type: 'single', banknote });
      continue;
    }
    
    // Extract the base number again
    const baseMatch = banknote.extendedPickNumber.match(/^(\d+[A-Z]?)/);
    const baseNumber = baseMatch ? baseMatch[1] : banknote.extendedPickNumber;
    
    // Skip if we've already processed this base number
    if (processedBaseNumbers.has(baseNumber)) continue;
    
    // Mark this base number as processed
    processedBaseNumbers.add(baseNumber);
    
    // Get all banknotes with this base number
    const groupBanknotes = banknoteMap.get(baseNumber) || [];
    
    // If there's only one, add it as a single
    if (groupBanknotes.length === 1) {
      mixedItems.push({ type: 'single', banknote: groupBanknotes[0] });
    } else {
      // Otherwise, add it as a group
      mixedItems.push({ 
        type: 'group', 
        group: {
          baseNumber,
          items: groupBanknotes,
          count: groupBanknotes.length
        }
      });
    }
  }
  
  return mixedItems;
};

/**
 * Returns an array of sultan groups, each containing mixed single and group items.
 * This function combines both sultan grouping and banknote grouping by extended pick number.
 */
export const getMixedBanknoteItemsBySultan = (
  banknotes: DetailedBanknote[]
): { sultan: string; items: MixedBanknoteItem[] }[] => {
  // First, group banknotes by sultan
  const sultanMap = new Map<string, DetailedBanknote[]>();
  
  banknotes.forEach(banknote => {
    const sultan = banknote.sultanName || 'Unknown';
    if (!sultanMap.has(sultan)) {
      sultanMap.set(sultan, []);
    }
    sultanMap.get(sultan)?.push(banknote);
  });
  
  // Then, for each sultan group, apply the getMixedBanknoteItems function
  const result: { sultan: string; items: MixedBanknoteItem[] }[] = [];
  
  sultanMap.forEach((sultanBanknotes, sultan) => {
    // Get mixed items for this sultan's banknotes
    const mixedItems = getMixedBanknoteItems(sultanBanknotes);
    
    result.push({
      sultan,
      items: mixedItems
    });
  });
  
  // Sort by sultan name
  result.sort((a, b) => a.sultan.localeCompare(b.sultan));
  
  return result;
};
