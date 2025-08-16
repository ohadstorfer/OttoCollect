import React, { useEffect, useState } from "react";
import { DetailedBanknote, CollectionItem } from "@/types";
import { BanknoteGroups } from "@/components/banknotes/BanknoteGroups";
import LazyBanknoteDisplay from "./LazyBanknoteDisplay";

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
  // Add state for forcing re-renders
  const [forceUpdate, setForceUpdate] = useState(0);

  // Effect to force re-render when viewMode or groupMode changes
  useEffect(() => {
    console.log("[BanknoteDisplay] viewMode or groupMode changed:", { viewMode, groupMode });
    setForceUpdate(prev => prev + 1);
  }, [viewMode, groupMode]);

  // Effect to listen for mode change events
  useEffect(() => {
    const handleModeChange = (event: CustomEvent) => {
      console.log("[BanknoteDisplay] Received mode change event:", event.detail);
      setForceUpdate(prev => prev + 1);
    };

    window.addEventListener('groupModeChange', handleModeChange as EventListener);
    window.addEventListener('viewModeChange', handleModeChange as EventListener);
    
    return () => {
      window.removeEventListener('groupModeChange', handleModeChange as EventListener);
      window.removeEventListener('viewModeChange', handleModeChange as EventListener);
    };
  }, []);

  // Debug logging for props
  console.log("[BanknoteDisplay] Rendering with props:", { 
    viewMode, 
    groupMode, 
    groupsCount: groups.length,
    forceUpdate 
  });
  console.log("[BanknoteDisplay] Received userCollection, count:", userCollection?.length);

  return (
    <div className="mt-6" key={`banknote-display-${forceUpdate}`}>
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-8">
          <h3 className="text-xl font-medium mb-4"><span>No banknotes found</span></h3>
          <p className="text-muted-foreground">Try adjusting your filters or search criteria.</p>
        </div>
      ) : (
        <>
          <div>
            {/* Log before passing down */}
            {/* {console.log("[BanknoteDisplay] Passing userCollection to BanknoteGroups, length:", userCollection?.length)} */}
          </div>
          <LazyBanknoteDisplay
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