import React, { useState, useEffect, useCallback } from 'react';
import { DetailedBanknote } from '@/types';
import { fetchBanknotes } from '@/services/banknoteService';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { Link, useNavigate } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import { AlertTriangle, ShoppingBasket } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface MarketplaceItem extends DetailedBanknote {
  price: number;
  isSold: boolean;
}

interface UserFilters {
  priceRange: [number, number];
  showSoldItems: boolean;
}

export default function Marketplace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [banknotes, setBanknotes] = useState<MarketplaceItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [userFilters, setUserFilters] = useState<UserFilters>({
    priceRange: [0, 1000],
    showSoldItems: false,
  });

  const isDesktopOrLarger = useMediaQuery({ query: '(min-width: 1024px)' });

  const fetchMarketplaceItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedBanknotes = await fetchBanknotes();
      // Mock prices and sold status
      const marketplaceItems = fetchedBanknotes.map(banknote => ({
        ...banknote,
        price: Math.floor(Math.random() * 1000), // Random price up to 1000
        isSold: Math.random() < 0.2, // 20% chance of being sold
      }));
      setBanknotes(marketplaceItems);
    } catch (error) {
      console.error("Failed to fetch banknotes:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketplaceItems();
  }, [fetchMarketplaceItems]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const updatePriceRange = (value: number[]) => {
    setUserFilters(prev => ({ ...prev, priceRange: [value[0], value[1]] }));
  };

  const toggleSoldItems = (checked: boolean) => {
    setUserFilters(prev => ({ ...prev, showSoldItems: checked }));
  };

  const filteredItems = banknotes.filter(item => {
    const searchRegex = new RegExp(searchQuery, 'i');
    const matchesSearch = searchRegex.test(item.extendedPickNumber) || searchRegex.test(item.banknoteDescription);
    const matchesPriceRange = item.price >= userFilters.priceRange[0] && item.price <= userFilters.priceRange[1];
    const matchesSoldStatus = userFilters.showSoldItems || !item.isSold;

    return matchesSearch && matchesPriceRange && matchesSoldStatus;
  });

  return (
    <div className="page-container">
      <h1 className="page-title">Marketplace</h1>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Input
          type="search"
          placeholder="Search banknotes..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="flex-grow"
        />
        {isDesktopOrLarger && user ? (
          <Button onClick={() => navigate('/collection')} variant="outline" className="ml-auto">
            Manage Your Items
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Price Range</CardTitle>
            <CardDescription>Filter by price range</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="min">Min</Label>
              <Input id="min" value={userFilters.priceRange[0].toString()} className="w-24" readOnly />
              <Label htmlFor="max">Max</Label>
              <Input id="max" value={userFilters.priceRange[1].toString()} className="w-24" readOnly />
            </div>
            <Slider
              defaultValue={userFilters.priceRange}
              max={1000}
              step={10}
              onValueChange={updatePriceRange}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Filters</CardTitle>
            <CardDescription>Customize your search</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sold"
                  checked={userFilters.showSoldItems}
                  onCheckedChange={toggleSoldItems}
                />
                <Label htmlFor="sold">Show Sold Items</Label>
              </div>
              {userFilters.showSoldItems && (
                <div className="text-amber-500 flex items-center gap-1 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Including sold items</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sort By</CardTitle>
            <CardDescription>Sort the marketplace items</CardDescription>
          </CardHeader>
          <CardContent>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  Latest <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  Price: Low to High
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Price: High to Low
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Date Added: Newest
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Date Added: Oldest
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {!isLoading && filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4 text-muted-foreground">
              <ShoppingBasket className="h-12 w-12 mx-auto opacity-50" />
            </div>
            <h3 className="text-lg font-medium">No marketplace items found</h3>
            <p className="text-muted-foreground mt-2">Try adjusting your filters or check back later</p>
          </div>
        ) : null}
        {filteredItems.map(item => (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle>{item.extendedPickNumber}</CardTitle>
              <CardDescription>{item.banknoteDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <img
                src={item.imageUrls[0]}
                alt={item.banknoteDescription}
                className="w-full h-32 object-cover rounded-md mb-4"
              />
              <p className="text-sm text-gray-600">Price: ${item.price}</p>
              <p className="text-sm text-gray-500">
                {item.isSold ? 'Sold' : 'Available'}
              </p>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <Link to={`/banknote/${item.id}`}>
                <Button>View Details</Button>
              </Link>
              {user ? (
                <>
                  <Button onClick={() => navigate('/collection')} variant="outline">
                    Manage Your Items
                  </Button>
                </>
              ) : null}
            </CardFooter>
          </Card>
        ))}
      </div>

      {!isDesktopOrLarger && user ? (
        <div className="mb-4">
          <Button onClick={() => navigate('/collection')} variant="outline">
            Manage Your Items
          </Button>
        </div>
      ) : null}
    </div>
  );
}
