import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchCollectionItem } from '@/services/collectionService';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatDate } from '@/utils/formatters';
import { LabelValuePair } from '@/components/ui/label-value-pair';
import { Star, Calendar, DollarSign, ShoppingBag, Award } from 'lucide-react';

interface BanknoteCollectionDetailProps {
  isOwner?: boolean;
}

const BanknoteCollectionDetail: React.FC<BanknoteCollectionDetailProps> = ({ isOwner = true }) => {
  const { id } = useParams<{ id: string }>();
  
  // Fetch collection item data
  const { data: item } = useQuery({
    queryKey: ["collectionItem", id],
    queryFn: () => fetchCollectionItem(id || ""),
    enabled: !!id,
    // We don't need to handle loading/error states here as the parent component does that
  });

  if (!item) return null;

  return (
    <div className="divide-y">
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <LabelValuePair 
            label="Condition" 
            value={item.condition} 
            icon={<Star />} 
            iconClassNames={item.condition === 'UNC' ? 'text-green-500' : ''}
          />
          <LabelValuePair 
            label="Grade" 
            value={item.grade ? `${item.grade}/100` : null} 
            icon={<Award />}
          />
          <LabelValuePair 
            label="Purchase Date" 
            value={item.purchaseDate ? formatDate(item.purchaseDate) : null} 
            icon={<Calendar />}
          />
          <LabelValuePair 
            label="Purchase Price" 
            value={item.purchasePrice ? formatPrice(item.purchasePrice) : null} 
            icon={<DollarSign />}
          />
        </div>
        <div>
          <LabelValuePair 
            label="Seller" 
            value={item.seller} 
            icon={<ShoppingBag />}
          />
          <LabelValuePair 
            label="Notes" 
            value={item.notes} 
          />
          {item.isForSale && (
            <div className="py-2 flex items-center justify-between">
              <span className="text-right font-medium text-muted-foreground">For Sale</span>
              <div className="flex items-center">
                <Badge variant="destructive" className="ml-2">
                  {formatPrice(item.salePrice)}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {isOwner && (
        <div className="p-4">
          <h3 className="text-sm font-medium mb-2">Private Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LabelValuePair 
              label="Storage Location" 
              value={item.storageLocation} 
            />
            <LabelValuePair 
              label="Insurance Value" 
              value={item.insuranceValue ? formatPrice(item.insuranceValue) : null} 
              icon={<DollarSign />}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BanknoteCollectionDetail;
