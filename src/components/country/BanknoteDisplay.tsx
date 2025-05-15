
import React from "react";
import { DetailedBanknote, CollectionItem } from "@/types";
import { BanknoteGroups } from "@/components/banknotes/BanknoteGroups";

interface BanknoteDisplayProps {
  groups: {
    category: string;
    items: DetailedBanknote[];
    sultanGroups?: { sultan: string; items: DetailedBanknote[] }[];
  }[];
  showSultanGroups: boolean;
  viewMode: 'grid' | 'list';
  countryId: string;
  isLoading: boolean;
  groupMode: boolean;
  userCollection: CollectionItem[];
}

export const BanknoteDisplay: React.FC<BanknoteDisplayProps> = ({
  groups,
  showSultanGroups,
  viewMode,
  countryId,
  isLoading,
  groupMode,
  userCollection,
}) => {
  // Add a log for received userCollection
  console.log("[BanknoteDisplay] Received userCollection, count:", userCollection?.length);

  return (
    <div className="mt-6">
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-8">
          <h3 className="text-xl font-medium mb-4">No banknotes found</h3>
          <p className="text-muted-foreground">Try adjusting your filters or search criteria.</p>
        </div>
      ) : (
        <>
          <div>
            {/* Log before passing down */}
            {console.log("[BanknoteDisplay] Passing userCollection to BanknoteGroups, length:", userCollection?.length)}
          </div>
          <BanknoteGroups
            groups={groups}
            showSultanGroups={showSultanGroups}
            viewMode={viewMode}
            countryId={countryId}
            isLoading={isLoading}
            groupMode={groupMode}
            userCollection={userCollection}
          />
        </>
      )}
    </div>
  );
};
