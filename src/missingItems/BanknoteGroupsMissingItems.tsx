
import React from "react";
import { DetailedBanknote } from "@/types";
import { Card } from "@/components/ui/card";
import BanknoteDetailCardMissingItems from "@/components/banknotes/BanknoteDetailCardMissingItems";

// Props for grouping banknotes (for use in missing-items catalog display)
interface BanknoteGroupsMissingItemsProps {
  banknotes: DetailedBanknote[];
  countryName: string;
}

const BanknoteGroupsMissingItems: React.FC<BanknoteGroupsMissingItemsProps> = ({
  banknotes,
  countryName
}) => {
  if (!banknotes || banknotes.length === 0) {
    return (
      <Card className="p-8 text-center">
        <h3 className="text-xl font-medium mb-4">No Missing Banknotes</h3>
        <p className="text-muted-foreground mb-6">
          Congratulations! You've collected all banknotes from {countryName}.
        </p>
      </Card>
    );
  }

  return (
    <div className="page-container max-w-5xl mx-auto">
      <h3 className="text-xl font-medium mb-4">
        Missing Banknotes ({banknotes.length})
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {banknotes.map((banknote) => (
          <BanknoteDetailCardMissingItems
            key={banknote.id}
            banknote={banknote}
            source="missing"
          />
        ))}
      </div>
    </div>
  );
};

export default BanknoteGroupsMissingItems;
