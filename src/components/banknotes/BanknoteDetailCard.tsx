import { Banknote, CollectionItem, BanknoteDetailSource } from "@/types";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BanknoteDetailCardProps {
  banknote: Banknote;
  collectionItem?: CollectionItem;
  source: BanknoteDetailSource;
  ownerId?: string;
}

const BanknoteDetailCard = ({ 
  banknote, 
  collectionItem, 
  source, 
  ownerId 
}: BanknoteDetailCardProps) => {
  const navigate = useNavigate();
  
  const handleViewDetail = () => {
    navigate(`/banknote/${banknote.id}`, {
      state: { 
        source,
        ownerId
      }
    });
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="aspect-[3/2] relative">
        <img
          src={banknote.imageUrls[0] || '/placeholder.svg'}
          alt={`${banknote.country} ${banknote.denomination}`}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2">
          <Badge variant="secondary">{banknote.catalogId}</Badge>
        </div>
        {collectionItem?.isForSale && (
          <div className="absolute bottom-2 right-2">
            <Badge variant="destructive">For Sale</Badge>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-semibold truncate">{banknote.denomination}</h3>
            <p className="text-sm text-muted-foreground">{banknote.country}, {banknote.year}</p>
          </div>
        </div>
        {collectionItem && (
          <div className="text-sm">
            <p>Condition: {collectionItem.condition}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-end">
        <Button variant="outline" size="sm" onClick={handleViewDetail}>
          <Eye className="mr-2 h-4 w-4" /> View Details
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BanknoteDetailCard;
