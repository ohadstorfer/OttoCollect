
import React from 'react';
import { DetailedBanknote } from '@/types';
import BanknoteDetailCard from './BanknoteDetailCard';

interface BanknoteGroup {
  category: string;
  categoryId?: string;
  items: DetailedBanknote[];
  sultanGroups?: { sultan: string; items: DetailedBanknote[] }[];
}

interface BanknoteGroupsProps {
  groups: BanknoteGroup[];
  showSultanGroups?: boolean;
  viewMode?: 'grid' | 'list';
  onBanknoteClick?: () => void;
}

export const BanknoteGroups: React.FC<BanknoteGroupsProps> = ({ 
  groups, 
  showSultanGroups = false, 
  viewMode = 'grid',
  onBanknoteClick 
}) => {
  // Generate grid classes based on view mode
  const gridClasses = viewMode === 'grid' 
    ? "grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3" 
    : "space-y-2";

  return (
    <div className="space-y-8">
      {groups.map((group, i) => (
        <div key={`${group.category}-${i}`} className="mb-8">
          <h3 className="text-xl font-semibold mb-4">{group.category}</h3>
          
          {showSultanGroups && group.sultanGroups ? (
            <div className="space-y-6">
              {group.sultanGroups.map((sultanGroup, j) => (
                <div key={`${sultanGroup.sultan}-${j}`} className="mb-6">
                  <h4 className="text-lg font-medium mb-3 pl-2 border-l-4 border-ottoman-500">
                    {sultanGroup.sultan}
                  </h4>
                  <div className={gridClasses}>
                    {sultanGroup.items.map((banknote) => (
                      <BanknoteDetailCard 
                        key={banknote.id} 
                        banknote={banknote} 
                        viewMode={viewMode}
                        onNavigateToDetail={onBanknoteClick}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={gridClasses}>
              {group.items.map((banknote) => (
                <BanknoteDetailCard 
                  key={banknote.id} 
                  banknote={banknote} 
                  viewMode={viewMode}
                  onNavigateToDetail={onBanknoteClick}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
