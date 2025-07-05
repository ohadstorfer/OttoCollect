
import { Banknote } from "@/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface BanknoteCardProps {
  banknote: Banknote;
  compact?: boolean;
  className?: string;
  source?: string;
  linkTo?: string;
  onViewDetails?: (banknote: Banknote) => void;
  onAddToCollection?: (banknote: Banknote) => void;
}

const BanknoteCard = ({
  banknote,
  compact = false,
  className,
  source,
  linkTo,
  onViewDetails,
  onAddToCollection,
}: BanknoteCardProps) => {
  const [isHovering, setIsHovering] = useState(false);
  
  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(banknote);
    }
  };
  
  const handleAddToCollection = () => {
    if (onAddToCollection) {
      onAddToCollection(banknote);
    }
  };
  
  const renderDetailsButton = () => {
    if (linkTo) {
      return (
        <Button 
          variant="ghost" 
          size="sm"
          className="text-ottoman-300 hover:text-ottoman-100 hover:bg-ottoman-700/50"
          asChild
        >
          <Link to={linkTo}>
            <Eye className="h-4 w-4 mr-1" />
            Details
          </Link>
        </Button>
      );
    }
    
    return (
      <Button 
        variant="ghost" 
        size="sm"
        className="text-ottoman-300 hover:text-ottoman-100 hover:bg-ottoman-700/50"
        onClick={handleViewDetails}
      >
        <Eye className="h-4 w-4 mr-1" />
        Details
      </Button>
    );
  };
  
  return (
    <Card 
      className={cn(
        "ottoman-card overflow-hidden transition-all duration-300 animated-card", 
        isHovering ? "shadow-lg shadow-ottoman-800/30" : "",
        className
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="relative">
        <div className="aspect-[4/3] overflow-hidden">
          <img
            src={banknote.imageUrls[0] || '/placeholder.svg'}
            alt={`${banknote.country} ${banknote.denomination} (${banknote.year})`}
            className={cn(
              "w-full h-full object-cover transition-transform duration-500",
              isHovering ? "scale-110" : "scale-100"
            )}
          />
        </div>
        
        {/* Status badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {banknote.isPending && (
            <Badge variant="secondary">Pending Approval</Badge>
          )}
          {!banknote.isApproved && !banknote.isPending && (
            <Badge variant="destructive">Not Approved</Badge>
          )}
        </div>
      </div>
      
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-serif font-semibold text-parchment-500"><span>
              {banknote.denomination}</span>
              </h3>
            <p className="text-sm text-ottoman-300">
              {banknote.country}, {banknote.year}
            </p>
          </div>
          <Badge variant="gold" className="self-start">
            {banknote.catalogId}
          </Badge>
        </div>
      </CardHeader>
      
      {!compact && (
        <CardContent className="p-4 pt-2">
          <p className="text-sm text-ottoman-200 line-clamp-2">
            {banknote.description}
          </p>
          
          {banknote.series && (
            <p className="text-xs text-ottoman-400 mt-2">
              Series: {banknote.series}
            </p>
          )}
        </CardContent>
      )}
      
      <CardFooter className="p-4 pt-2 flex justify-between">
        {renderDetailsButton()}
        
        <Button 
          variant="outline" 
          size="sm"
          className="text-ottoman-300 hover:text-ottoman-100 border-ottoman-700 hover:bg-ottoman-700/50"
          onClick={handleAddToCollection}
        >
          <ShoppingCart className="h-4 w-4 mr-1" />
          Add
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BanknoteCard;
