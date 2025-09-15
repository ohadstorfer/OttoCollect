import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { DollarSign, Calendar, Tag, User, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from '@/context/LanguageContext';

import { MarketplaceItem } from '@/types';
import { cn } from '@/lib/utils';
import { useDateLocale } from '@/lib/dateUtils';
import { useTranslation } from 'react-i18next';


interface MarketplaceHighlightsProps {
  items: MarketplaceItem[];
  loading?: boolean;
}

const MarketplaceHighlights = ({ items, loading = false }: MarketplaceHighlightsProps) => {

  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const { formatRelativeTime } = useDateLocale();
  const { direction, currentLanguage } = useLanguage();
  const { t } = useTranslation(['marketplace']);



  // Helper function to get localized field values
  const getLocalizedField = (field: string, fieldType: 'face_value' | 'country'): string => {
    if (currentLanguage === 'en' || !field) {
      return field || '';
    }

    const banknoteAny = banknote as any;
    let languageSpecificField: string | undefined;

    if (currentLanguage === 'ar') {
      languageSpecificField = banknoteAny?.[`${fieldType}_ar`];
    } else if (currentLanguage === 'tr') {
      languageSpecificField = banknoteAny?.[`${fieldType}_tr`];
    }

    return languageSpecificField || field;
  };


  const formatTimeAgo = (dateString: string) => {
    try {
      return formatRelativeTime(dateString);
    } catch (error) {
      // Fallback to original format if there's an error
      return formatRelativeTime(new Date(dateString));
    }
  };

  const nextItem = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const prevItem = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
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
          onClick={() => navigate('/marketplace')}
          className="mt-4"
        >
          List an item for sale
        </Button>
      </div>
    );
  }

  const handleItemClick = (itemId: string) => {
    console.log('Marketplace highlight item clicked:', itemId);
    navigate(`/marketplace-item/${itemId}`);
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
              <div className={`flex justify-between ${direction === 'rtl' ? 'text-right' : 'text-left'}`}>
                <h3 className="font-serif font-semibold text-lg text-parchment-400">
                  <span>{item.collectionItem.banknote.denomination} ({item.collectionItem.banknote.year})</span>
                </h3>
                <span className="flex items-center text-ottoman-100 font-semibold bg-ottoman-600/50 px-2 py-0.5 rounded text-sm">
                  ${item.collectionItem.salePrice}
                </span>
              </div>

              {/* Item Country */}
              <p className="text-sm text-ottoman-300 mb-2">
                {item.collectionItem.banknote.country}
              </p>

              {/* Additional Info */}
              <div className="flex items-center text-xs text-ottoman-300 gap-3">
                {item.collectionItem.condition && (
                  <div className="flex items-center">
                    <Tag className="h-3 w-3 mr-1" />
                    {item.collectionItem.condition}
                  </div>
                )}

                {item.createdAt && (
                  <div className="flex items-center">
                    <Calendar
                      className={`h-3 w-3 ${item.collectionItem.condition ? "mr-1" : ""
                        }`}
                    />
                    {formatTimeAgo(item.createdAt)}
                  </div>
                )}
              </div>


              {/* Description or note if available */}
              {/* {item.collectionItem.publicNote && (
                <p className="mt-2 text-sm text-ottoman-200 line-clamp-2">
                  {item.collectionItem.publicNote}
                </p>
              )} */}

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

  // For mobile - custom carousel view
  const CarouselView = () => {
    const currentItem = items[currentIndex];

    return (
      <div className="md:hidden w-full">
        <div
          className="glass-card p-5 cursor-pointer hover:shadow-lg transition-all border border-ottoman-800/50 h-full"
          onClick={() => handleItemClick(currentItem.id)}
        >
          <div className="flex flex-col gap-4">
            {/* Item Image */}
            <div className="w-full aspect-[3/2] rounded-md overflow-hidden border border-ottoman-800/50">
              {currentItem.collectionItem.obverseImage ? (
                <img
                  src={currentItem.collectionItem.obverseImage}
                  alt={`${currentItem.collectionItem.banknote.country} ${currentItem.collectionItem.banknote.denomination}`}
                  className="w-full h-full object-cover"
                />
              ) : (currentItem.collectionItem.banknote.imageUrls && currentItem.collectionItem.banknote.imageUrls.length > 0) ? (
                <img
                  src={currentItem.collectionItem.banknote.imageUrls[0]}
                  alt={`${currentItem.collectionItem.banknote.country} ${currentItem.collectionItem.banknote.denomination}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-ottoman-700 flex items-center justify-center">
                  <DollarSign className="w-10 h-10 text-parchment-100" />
                </div>
              )}
            </div>

            <div className={`${direction === "rtl" ? "text-right" : "text-left"}`}>
              {/* Item Title */}
              <div className={`flex justify-between ${direction === "rtl" ? "flex-row-reverse" : "flex-row"}`}>
                <h3 className="font-serif font-semibold text-lg text-parchment-400">
                  <span>{currentItem.collectionItem.banknote.denomination} ({currentItem.collectionItem.banknote.year})</span>
                </h3>
                <span className="text-ottoman-100 font-semibold bg-ottoman-600/50 px-2 py-0.5 rounded text-sm">
                  ${currentItem.collectionItem.salePrice}
                </span>
              </div>



              {/* Additional Info */}
              <div className="flex items-center text-xs text-ottoman-300 gap-3">

                {/* Item Country */}
                <div className="flex items-center">
                  <p className={`text-sm text-ottoman-300 mb-2 ${direction === "rtl" ? "text-right" : "text-left"}`}>
                    {currentItem.collectionItem.banknote.country}
                  </p>
                </div>

                <div className="flex items-center">
                  <Tag className="h-3 w-3 mr-1" />
                  {currentItem.collectionItem.condition}
                </div>
                <div className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {formatTimeAgo(currentItem.createdAt)}
                </div>
              </div>

              {/* Seller info */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-ottoman-400">Seller:</span>
                <span className="text-xs text-ottoman-200">{currentItem.seller.username}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex justify-center items-center gap-4 mt-4">
          <Button
            variant="outline"
            size="icon"
            onClick={prevItem}
            className="h-10 w-10"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex gap-1">
            {items.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  index === currentIndex
                    ? "bg-ottoman-400"
                    : "bg-ottoman-600"
                )}
              />
            ))}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={nextItem}
            className="h-10 w-10"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

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
