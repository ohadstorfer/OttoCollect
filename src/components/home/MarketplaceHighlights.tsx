import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { DollarSign, Calendar, Tag, User } from "lucide-react";
import { format, isValid, parseISO } from 'date-fns';
import { formatDistanceToNow } from 'date-fns';
import { MarketplaceItem } from '@/types';
import { cn } from '@/lib/utils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface MarketplaceHighlightsProps {
  items: MarketplaceItem[];
  loading?: boolean;
}

const MarketplaceHighlights = ({ items, loading = false }: MarketplaceHighlightsProps) => {
  console.log('Rendering MarketplaceHighlights component with items:', items?.length || 0);
  
  useEffect(() => {
    console.log('MarketplaceHighlights items:', items);
  }, [items]);
  
  const navigate = useNavigate();
  
  // Function to safely format dates
  const safeFormatDate = (dateString: string) => {
    try {
      // Parse the ISO string to a Date object first
      console.log('Formatting date:', dateString);
      const date = parseISO(dateString);
      // Check if the resulting date is valid before formatting
      if (isValid(date)) {
        return format(date, 'MMM d, yyyy');
      }
      console.log('Invalid date:', dateString);
      return 'Unknown date';
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Unknown date';
    }
  };

  const displayDate = (dateString: string | Date): string => {
    if (dateString instanceof Date) {
      return formatDistanceToNow(dateString, { addSuffix: true });
    }
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  if (loading) {
    console.log('MarketplaceHighlights in loading state');
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-500"></div>
      </div>
    );
  }
  
  if (!items || items.length === 0) {
    console.log('No marketplace items available for highlights');
    return (
      <div className="text-center py-12">
        <p className="text-ottoman-300">No marketplace items available.</p>
        <Button 
          onClick={() => navigate('/marketplace/new')}
          className="mt-4"
        >
          List an item for sale
        </Button>
      </div>
    );
  }
  
  const handleItemClick = (itemId: string) => {
    console.log('Marketplace highlight item clicked:', itemId);
    navigate(`/marketplace/${itemId}`);
  };

  // For larger screens - grid view
  const GridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {items.slice(0, 2).map((item, index) => (
        <div 
          key={item.id} 
          className={cn(
            "glass-card p-5 cursor-pointer hover:shadow-lg transition-all border border-ottoman-800/50",
            index % 2 === 0 ? "fade-right" : "fade-left"
          )}
          onClick={() => handleItemClick(item.id)}
        >
          <div className="flex gap-4">
            {/* Item Image */}
            <div className="w-24 h-24 rounded-md overflow-hidden border border-ottoman-800/50 flex-shrink-0">
              {item.collectionItem.obverseImage ? (
                <img 
                  src={item.collectionItem.obverseImage} 
                  alt={`${item.collectionItem.banknote.country} ${item.collectionItem.banknote.denomination}`}
                  className="w-full h-full object-cover"
                />
              ) : (item.collectionItem.banknote.imageUrls && item.collectionItem.banknote.imageUrls.length > 0) ? (
                <img 
                  src={item.collectionItem.banknote.imageUrls[0]} 
                  alt={`${item.collectionItem.banknote.country} ${item.collectionItem.banknote.denomination}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-ottoman-700 flex items-center justify-center">
                  <DollarSign className="w-10 h-10 text-parchment-100" />
                </div>
              )}
            </div>
            
            <div className="flex-1">
              {/* Item Title */}
              <div className="flex justify-between">
                <h3 className="font-serif font-semibold text-lg text-parchment-400">
                  {item.collectionItem.banknote.denomination} ({item.collectionItem.banknote.year})
                </h3>
                <span className="text-ottoman-100 font-semibold bg-ottoman-600/50 px-2 py-0.5 rounded text-sm">
                  ${item.collectionItem.salePrice}
                </span>
              </div>
              
              {/* Item Country */}
              <p className="text-sm text-ottoman-300 mb-2">
                {item.collectionItem.banknote.country}
              </p>
              
              {/* Additional Info */}
              <div className="flex items-center text-xs text-ottoman-300 gap-3">
                <div className="flex items-center">
                  <Tag className="h-3 w-3 mr-1" />
                  {item.collectionItem.condition}
                </div>
                <div className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {safeFormatDate(item.createdAt)}
                </div>
              </div>
              
              {/* Description or note if available */}
              {item.collectionItem.publicNote && (
                <p className="mt-2 text-sm text-ottoman-200 line-clamp-2">
                  {item.collectionItem.publicNote}
                </p>
              )}
              
              {/* Seller info */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-ottoman-400">Seller:</span>
                <span className="text-xs text-ottoman-200">{item.seller.username}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
  
  // For mobile - carousel view
  const CarouselView = () => (
    <Carousel className="md:hidden w-full">
      <CarouselContent>
        {items.map((item, index) => (
          <CarouselItem key={item.id}>
            <div 
              className="glass-card p-5 cursor-pointer hover:shadow-lg transition-all border border-ottoman-800/50 h-full"
              onClick={() => handleItemClick(item.id)}
            >
              <div className="flex flex-col gap-4">
                {/* Item Image */}
                <div className="w-full aspect-[3/2] rounded-md overflow-hidden border border-ottoman-800/50">
                  {item.collectionItem.obverseImage ? (
                    <img 
                      src={item.collectionItem.obverseImage} 
                      alt={`${item.collectionItem.banknote.country} ${item.collectionItem.banknote.denomination}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (item.collectionItem.banknote.imageUrls && item.collectionItem.banknote.imageUrls.length > 0) ? (
                    <img 
                      src={item.collectionItem.banknote.imageUrls[0]} 
                      alt={`${item.collectionItem.banknote.country} ${item.collectionItem.banknote.denomination}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-ottoman-700 flex items-center justify-center">
                      <DollarSign className="w-10 h-10 text-parchment-100" />
                    </div>
                  )}
                </div>
                
                <div>
                  {/* Item Title */}
                  <div className="flex justify-between">
                    <h3 className="font-serif font-semibold text-lg text-parchment-400">
                      {item.collectionItem.banknote.denomination} ({item.collectionItem.banknote.year})
                    </h3>
                    <span className="text-ottoman-100 font-semibold bg-ottoman-600/50 px-2 py-0.5 rounded text-sm">
                      ${item.collectionItem.salePrice}
                    </span>
                  </div>
                  
                  {/* Item Country */}
                  <p className="text-sm text-ottoman-300 mb-2">
                    {item.collectionItem.banknote.country}
                  </p>
                  
                  {/* Additional Info */}
                  <div className="flex items-center text-xs text-ottoman-300 gap-3">
                    <div className="flex items-center">
                      <Tag className="h-3 w-3 mr-1" />
                      {item.collectionItem.condition}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {safeFormatDate(item.createdAt)}
                    </div>
                  </div>
                  
                  {/* Seller info */}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-ottoman-400">Seller:</span>
                    <span className="text-xs text-ottoman-200">{item.seller.username}</span>
                  </div>
                </div>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className="flex justify-center mt-4">
        <CarouselPrevious className="static translate-y-0 mr-2" />
        <CarouselNext className="static translate-y-0 ml-2" />
      </div>
    </Carousel>
  );

  return (
    <>
      {/* Floating animation keyframes */}
      <style>{`
        @keyframes floatRotate {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-10px) rotate(2deg);
          }
        }
      `}</style>
      
      {/* Responsive layout - grid for desktop, carousel for mobile */}
      <div className="hidden md:block">
        <GridView />
      </div>
      <div className="block md:hidden">
        <CarouselView />
      </div>
    </>
  );
};

export default MarketplaceHighlights;
