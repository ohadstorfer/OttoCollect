
import { CollectionItem } from "@/types";
import { DetailedBanknote } from "@/types";

/**
 * Checks if the user already owns a specific banknote.
 *
 * @param banknote The banknote to look for in the user's collection
 * @param collectionItems The user's collection
 * @returns true if the user owns the banknote, false otherwise
 */
export function userHasBanknoteInCollection(
  banknote: DetailedBanknote,
  collectionItems: CollectionItem[]
) {
  return collectionItems.some(
    (item) => item.banknoteId === banknote.id
  );
}
