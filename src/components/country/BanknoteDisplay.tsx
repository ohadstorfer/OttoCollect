import React from 'react';
import { DetailedBanknote } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, ShoppingCart, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BanknoteDisplayProps {
  banknote: DetailedBanknote;
  wishlistButton?: React.ReactNode;
  missingButton?: React.ReactNode;
  condition?: string;
  isForSale?: boolean;
  salePrice?: number;
  onSave?: () => void;
}

const BanknoteDisplay: React.FC<BanknoteDisplayProps> = ({
  banknote,
  wishlistButton,
  missingButton,
  condition,
  isForSale,
  salePrice,
  onSave
}) => {
  const navigate = useNavigate();

  const handleViewDetails = () => {
    navigate(`/catalog/${banknote.country}/${banknote.id}`);
  };

  return (
    <Card className="bg-card text-card-foreground shadow-md overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">
          {banknote.denomination}
        </CardTitle>
        <Badge variant="secondary">{banknote.catalogId}</Badge>
      </CardHeader>

      <CardContent className="p-0">
        {banknote.imageUrls && banknote.imageUrls.length > 0 ? (
          <img
            src={banknote.imageUrls[0]}
            alt={`${banknote.country} ${banknote.denomination}`}
            className="w-full h-auto object-cover aspect-[4/3]"
          />
        ) : (
          <div className="aspect-[4/3] bg-muted flex items-center justify-center">
            <p className="text-muted-foreground">No Image</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col p-2 gap-1">
        <div className="flex flex-col space-y-1">
          <p className="text-sm font-medium">{banknote.country}</p>
          <p className="text-sm text-muted-foreground">
            {banknote.year} - {banknote.type}
          </p>
          {condition && <p className="text-xs text-gray-500">Condition: {condition}</p>}
          {isForSale && salePrice && (
            <p className="text-xs text-green-600">For Sale: ${salePrice}</p>
          )}
        </div>

        <div className="flex justify-between items-center mt-2">
          <Button variant="outline" size="sm" onClick={handleViewDetails}>
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>

          <div className="flex items-center space-x-2">
            {wishlistButton}
            {missingButton}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default BanknoteDisplay;
