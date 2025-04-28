
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
