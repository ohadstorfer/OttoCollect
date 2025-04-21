
import React from 'react';
import { DetailedBanknote } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';

interface BanknoteGridProps {
  banknotes: DetailedBanknote[];
}

export const BanknoteGrid: React.FC<BanknoteGridProps> = ({ banknotes }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {banknotes.map((banknote) => (
        <Link 
          to={`/banknote-details/${banknote.id}`} 
          className="block transition-all hover:scale-[1.02] focus:outline-none"
          key={banknote.id}
        >
          <Card className="h-full overflow-hidden">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base truncate">
                {banknote.denomination}
              </CardTitle>
              <CardDescription className="text-xs truncate">
                {banknote.extendedPickNumber}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <AspectRatio ratio={3/2} className="bg-muted mb-2 overflow-hidden rounded-md">
                <img 
                  src={banknote.imageUrls?.[0] || '/placeholder-banknote.png'} 
                  alt={banknote.denomination} 
                  className="h-full w-full object-cover"
                />
              </AspectRatio>
              <div className="flex flex-wrap gap-1 mt-2">
                {banknote.year && (
                  <Badge variant="outline" className="text-xs">
                    {banknote.year}
                  </Badge>
                )}
                {banknote.type && (
                  <Badge variant="secondary" className="text-xs">
                    {banknote.type}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
};
