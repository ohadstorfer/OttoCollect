import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchBanknoteById } from '@/services/banknoteService';
import { DetailedBanknote } from '@/types';
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Copy, Link as LucideLink, AlertCircle, CheckCircle, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/context/AuthContext';
import { addToCollection } from '@/services/collectionService';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Link } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';

export default function BanknoteCatalogDetail() {
  const { id } = useParams<{ id: string }>();
  const [banknote, setBanknote] = useState<DetailedBanknote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!id) {
      console.error("No banknote ID provided.");
      return;
    }

    const loadBanknote = async () => {
      setIsLoading(true);
      try {
        const fetchedBanknote = await fetchBanknoteById(id);
        setBanknote(fetchedBanknote);
      } catch (error) {
        console.error("Failed to load banknote:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load banknote. Please try again.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadBanknote();
  }, [id, toast]);
  
  const handleAddToCollection = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not signed in.",
        description: "You must be signed in to add to your collection.",
      });
      navigate('/auth');
      return;
    }
    
    if (!banknote) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Banknote details not loaded yet. Please try again.",
      });
      return;
    }

    setIsAdding(true);
    try {
      const success = await addToCollection(user.id, banknote.id);
      if (success) {
        toast({
          title: "Success",
          description: "Banknote added to your collection!",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to add banknote to your collection. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error adding to collection:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add banknote to your collection. Please try again.",
      });
    } finally {
      setIsAdding(false);
    }
  };
  
  const handleCopyCatalogId = () => {
    if (banknote?.catalogId) {
      navigator.clipboard.writeText(banknote.catalogId)
        .then(() => {
          setIsCopied(true);
          toast({
            title: "Copied!",
            description: "Catalog ID copied to clipboard.",
          });
          setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
        })
        .catch(err => {
          console.error("Failed to copy:", err);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to copy catalog ID to clipboard.",
          });
        });
    }
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <h1 className="page-title">
          <Skeleton width={200} />
        </h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="ottoman-card p-6">
              <Skeleton className="w-full aspect-[4/3] mb-4" />
              <Skeleton width={150} className="mb-2" />
              <Skeleton width={200} className="mb-2" />
              <Skeleton width={100} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!banknote) {
    return (
      <div className="page-container">
        <h1 className="page-title">Banknote Detail</h1>
        <div className="ottoman-card p-6 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-lg font-medium">Banknote not found</p>
          <p className="text-muted-foreground">
            The requested banknote could not be found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-container">
        <h1 className="page-title">
          {banknote.country} - {banknote.denomination} {banknote.series}
        </h1>
        
        <div className="md:flex md:items-start md:space-x-6">
          <div className="md:w-1/2">
            <div className="ottoman-card mb-4">
              <div className="relative">
                {banknote.imageUrls && banknote.imageUrls.length > 0 ? (
                  <img
                    src={banknote.imageUrls[0]}
                    alt={`${banknote.country} - ${banknote.denomination} ${banknote.series}`}
                    className="w-full aspect-[4/3] object-contain rounded-md"
                  />
                ) : (
                  <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400">
                    No Image Available
                  </div>
                )}
                
                <div className="absolute top-2 left-2 flex space-x-1">
                  {banknote.isApproved && (
                    <Badge variant="outline" className="opacity-80">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approved
                    </Badge>
                  )}
                  {banknote.isPending && (
                    <Badge variant="secondary" className="opacity-80">
                      <Clock className="h-4 w-4 mr-1 animate-pulse" />
                      Pending
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="p-4">
                <h2 className="text-xl font-semibold mb-2">
                  {banknote.extendedPickNumber}
                </h2>
                <p className="text-muted-foreground">
                  {banknote.description}
                </p>
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-2">
              <Button onClick={handleAddToCollection} disabled={isAdding}>
                {isAdding ? (
                  <>
                    Adding... <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  </>
                ) : (
                  "Add to Collection"
                )}
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={handleCopyCatalogId} disabled={isCopied}>
                    Copy Catalog ID
                    <Copy className="ml-auto h-4 w-4" />
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={`/banknote/${banknote.id}`}>
                      View Full Details
                      <LucideLink className="ml-auto h-4 w-4" />
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <div className="md:w-1/2">
            <div className="ottoman-card">
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-2">Details</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Country</p>
                    <p className="text-parchment-500">{banknote.country}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Denomination</p>
                    <p className="text-parchment-500">{banknote.denomination}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Year</p>
                    <p className="text-parchment-500">{banknote.year}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Series</p>
                    <p className="text-parchment-500">{banknote.series}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Catalog ID</p>
                    <p className="text-parchment-500">{banknote.catalogId}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pick Number</p>
                    <p className="text-parchment-500">{banknote.pickNumber}</p>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <h3 className="text-md font-semibold mb-2">Descriptions</h3>
                <p className="text-sm text-muted-foreground">
                  {banknote.banknoteDescription || 'No description available.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <meta
        name="description"
        content={`${banknote.country} - ${banknote.denomination} ${banknote.series}. Details: ${banknote.description}`}
      />
      <meta property="og:title" content={`${banknote.country} - ${banknote.denomination} ${banknote.series}`} />
      <meta property="og:description" content={banknote.description} />
      
      
      <meta property="og:image" content={Array.isArray(banknote.front_picture) ? banknote.front_picture[0] : banknote.front_picture} />
    </>
  );
}
