
import { Banknote, CollectionItem } from "@/types";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  Calendar, 
  MapPin, 
  BarChart3,
  BookOpen,
  Printer,
  Palette,
  CircleDollarSign,
  Award
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BanknoteDetailCardProps {
  banknote: Banknote;
  collectionItem?: CollectionItem;
  source: "catalog" | "collection" | "wishlist" | "missing";
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

  // Detail items to display in the card
  const detailItems = [
    { icon: <Calendar className="h-4 w-4 text-muted-foreground" />, 
      label: "Year", 
      value: banknote.year 
    },
    { icon: <MapPin className="h-4 w-4 text-muted-foreground" />, 
      label: "Country", 
      value: banknote.country 
    },
    { icon: <BookOpen className="h-4 w-4 text-muted-foreground" />, 
      label: "Series", 
      value: banknote.series 
    },
    { icon: <CircleDollarSign className="h-4 w-4 text-muted-foreground" />, 
      label: "Denomination", 
      value: banknote.denomination 
    }
  ];

  // For collection items only
  const collectionDetails = collectionItem ? [
    { icon: <Award className="h-4 w-4 text-muted-foreground" />, 
      label: "Condition", 
      value: collectionItem.condition 
    },
    { icon: <BarChart3 className="h-4 w-4 text-muted-foreground" />, 
      label: "Price", 
      value: collectionItem.isForSale && collectionItem.salePrice ? 
             `$${collectionItem.salePrice}` : 
             null
    }
  ] : [];

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
            <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">For Sale</Badge>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-semibold truncate">{banknote.denomination}</h3>
            <p className="text-sm text-muted-foreground">{banknote.country}, {banknote.year}</p>
          </div>
        </div>

        <div className="space-y-2 text-sm divide-y divide-gray-100">
          {detailItems.map((item, index) => (
            item.value && (
              <div key={index} className={`flex justify-between items-center ${index > 0 ? 'pt-2' : ''}`}>
                <div className="flex items-center gap-2">
                  {item.icon}
                  <span className="text-muted-foreground">{item.label}:</span>
                </div>
                <span className="font-medium">{item.value}</span>
              </div>
            )
          ))}
          
          {collectionDetails.map((item, index) => (
            item.value && (
              <div key={`coll-${index}`} className="flex justify-between items-center pt-2">
                <div className="flex items-center gap-2">
                  {item.icon}
                  <span className="text-muted-foreground">{item.label}:</span>
                </div>
                <span className="font-medium">{item.value}</span>
              </div>
            )
          ))}
        </div>
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
