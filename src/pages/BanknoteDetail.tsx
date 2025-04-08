
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchBanknoteDetail } from '@/services/banknoteService';
import { DetailedBanknote, BanknoteDetailSource } from '@/types';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ArrowLeft, Heart } from 'lucide-react';
import { addToWishlist, removeFromWishlist, fetchWishlistItem } from '@/services/wishlistService';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const BanknoteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [banknote, setBanknote] = useState<DetailedBanknote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inWishlist, setInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const { user } = useAuth();
  const [source] = useState<BanknoteDetailSource>(() => {
    const url = window.location.pathname;
    if (url.includes('/collection')) return 'collection';
    if (url.includes('/wishlist')) return 'wishlist';
    if (url.includes('/marketplace')) return 'marketplace';
    if (url.includes('/country')) return 'country-detail';
    return 'catalog';
  });

  useEffect(() => {
    const loadData = async () => {
      if (!id) {
        setError('No banknote ID provided');
        setLoading(false);
        return;
      }

      try {
        const fetchedBanknote = await fetchBanknoteDetail(id);
        
        if (!fetchedBanknote) {
          setError('Banknote not found');
          setLoading(false);
          return;
        }
        
        setBanknote(fetchedBanknote);
        
        // Check if the banknote is in the user's wishlist
        if (user) {
          const isInWishlist = await fetchWishlistItem(user.id, id);
          setInWishlist(isInWishlist);
        }
        
      } catch (e) {
        console.error('Error fetching banknote:', e);
        setError('Failed to load banknote details');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, user]);

  const handleToggleWishlist = async () => {
    if (!user || !banknote) {
      toast.error("You must be logged in to manage your wishlist");
      return;
    }
    
    setWishlistLoading(true);
    
    try {
      if (inWishlist) {
        await removeFromWishlist(user.id, banknote.id);
        setInWishlist(false);
        toast.success("Removed from wishlist");
      } else {
        await addToWishlist(user.id, banknote.id);
        setInWishlist(true);
        toast.success("Added to wishlist");
      }
    } catch (e) {
      console.error('Error updating wishlist:', e);
      toast.error("Failed to update wishlist");
    } finally {
      setWishlistLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (error || !banknote) {
    return (
      <div className="page-container">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p className="mb-6 text-muted-foreground">{error || 'Failed to load banknote details'}</p>
          <Button asChild>
            <Link to="/catalog">Back to Catalog</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Format the path for the back button based on the source
  const getBackPath = () => {
    switch (source) {
      case 'collection':
        return '/collection';
      case 'wishlist':
        return '/wishlist';
      case 'marketplace':
        return '/marketplace';
      case 'country-detail':
        // Extract country from URL or use a default
        const country = banknote.country.toLowerCase().replace(/\s+/g, '-');
        return `/catalog/country/${country}`;
      default:
        return '/catalog';
    }
  };

  return (
    <div className="page-container">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div className="flex items-center gap-2 mb-4 md:mb-0">
          <Button variant="outline" size="sm" asChild>
            <Link to={getBackPath()}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
          
          {user && (
            <Button 
              variant={inWishlist ? "outline" : "default"} 
              size="sm"
              onClick={handleToggleWishlist}
              disabled={wishlistLoading}
            >
              <Heart className={`h-4 w-4 mr-1 ${inWishlist ? 'fill-current' : ''}`} />
              {inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="glass-card p-6 rounded-lg shadow-md mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            {banknote.denomination} ({banknote.year})
          </h1>
          <p className="text-lg mb-6">
            {banknote.country} | {banknote.pickNumber || banknote.extendedPickNumber || 'N/A'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              {banknote.frontPicture && (
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">Obverse</h3>
                  <img 
                    src={banknote.frontPicture} 
                    alt={`${banknote.denomination} obverse`}
                    className="w-full h-auto rounded-md border border-muted"
                  />
                </div>
              )}
            </div>

            <div>
              {banknote.backPicture && (
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">Reverse</h3>
                  <img 
                    src={banknote.backPicture} 
                    alt={`${banknote.denomination} reverse`}
                    className="w-full h-auto rounded-md border border-muted"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              {banknote.pickNumber && (
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Pick Number:</span>
                  <span>{banknote.pickNumber}</span>
                </div>
              )}

              {banknote.extendedPickNumber && (
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Extended Pick:</span>
                  <span>{banknote.extendedPickNumber}</span>
                </div>
              )}

              {banknote.turkCatalogNumber && (
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Turk Catalog:</span>
                  <span>{banknote.turkCatalogNumber}</span>
                </div>
              )}

              {banknote.gregorianYear && (
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Gregorian Year:</span>
                  <span>{banknote.gregorianYear}</span>
                </div>
              )}

              {banknote.islamicYear && (
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Islamic Year:</span>
                  <span>{banknote.islamicYear}</span>
                </div>
              )}

              {banknote.faceValue && (
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Face Value:</span>
                  <span>{banknote.faceValue}</span>
                </div>
              )}

              {banknote.sultanName && (
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Sultan:</span>
                  <span>{banknote.sultanName}</span>
                </div>
              )}

              {banknote.category && (
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Category:</span>
                  <span>{banknote.category}</span>
                </div>
              )}

              {banknote.type && (
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Type:</span>
                  <span>{banknote.type}</span>
                </div>
              )}

              {banknote.printer && (
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Printer:</span>
                  <span>{banknote.printer}</span>
                </div>
              )}

              {banknote.rarity && (
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Rarity:</span>
                  <span>{banknote.rarity}</span>
                </div>
              )}
            </div>
          </div>

          {banknote.banknoteDescription && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-2">Description</h3>
              <p>{banknote.banknoteDescription}</p>
            </div>
          )}

          {banknote.historicalDescription && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-2">Historical Context</h3>
              <p>{banknote.historicalDescription}</p>
            </div>
          )}
          
          {/* Additional images if available */}
          {(banknote.sealPictures && banknote.sealPictures.length > 0) && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-2">Seals</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {banknote.sealPictures.map((url, i) => (
                  <div key={i} className="aspect-square">
                    <img 
                      src={url} 
                      alt={`Seal ${i+1}`}
                      className="w-full h-full object-contain rounded-md border border-muted"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {banknote.tughraPicture && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-2">Tughra</h3>
              <div className="max-w-xs">
                <img 
                  src={banknote.tughraPicture} 
                  alt="Tughra"
                  className="w-full h-auto rounded-md border border-muted"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BanknoteDetail;
