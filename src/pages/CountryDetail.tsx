
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchCountryDetail } from "@/services/countryService";
import { fetchBanknotesByCountryId } from "@/services/banknoteService";
import { DetailedBanknote } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { BanknoteGrid } from "@/components/banknote/BanknoteGrid";
import { useBanknoteFilters } from "@/hooks/use-banknote-filters";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  ArrowLeft,
  Search,
  Filter,
  ChevronsUpDown
} from "lucide-react";

const SORT_OPTIONS = [
  { value: 'extPick', label: 'Extended Pick Number' },
  { value: 'faceValue', label: 'Face Value' },
  { value: 'sultan', label: 'Sultan' }
];

const CountryDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [country, setCountry] = useState(null);
  const [banknotes, setBanknotes] = useState<DetailedBanknote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useBanknoteFilters();
  const [currencies, setCurrencies] = useState<{ name: string; display_order: number; }[]>([]);

  useEffect(() => {
    const loadCountryAndBanknotes = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const countryData = await fetchCountryDetail(id);
        setCountry(countryData);

        const banknotesData = await fetchBanknotesByCountryId(id);
        setBanknotes(banknotesData);

        // Extract unique currencies and their display orders
        const uniqueCurrencies = Array.from(new Set(
          banknotesData.map(banknote => {
            const match = banknote.denomination?.match(/^(\D+)/);
            return match ? match[1].trim() : null;
          }).filter(Boolean)
        ));

        // Assign display orders based on frequency
        const currencyCounts: { [key: string]: number } = {};
        banknotesData.forEach(banknote => {
          const match = banknote.denomination?.match(/^(\D+)/);
          const currency = match ? match[1].trim() : null;
          if (currency) {
            currencyCounts[currency] = (currencyCounts[currency] || 0) + 1;
          }
        });

        const sortedCurrencies = Object.entries(currencyCounts)
          .sort(([, countA], [, countB]) => countB - countA)
          .map(([currency]) => currency);

        const currencyObjects = sortedCurrencies.map((currency, index) => ({
          name: currency,
          display_order: index + 1,
        }));

        setCurrencies(currencyObjects);
      } catch (error) {
        console.error("Error loading country details:", error);
        toast({
          title: "Error",
          description: "Failed to load country details.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadCountryAndBanknotes();
  }, [id, toast]);

  const getCurrencyOrder = (denomination: string | undefined) => {
    if (!denomination || currencies.length === 0) return Number.MAX_SAFE_INTEGER;
    const currencyObj = currencies.find(
      c => denomination.toLowerCase().includes(c.name.toLowerCase())
    );
    return currencyObj ? currencyObj.display_order : Number.MAX_SAFE_INTEGER;
  };

  const parseFaceValue = (denomination: string | undefined) => {
    if (!denomination) return NaN;
    const match = denomination.match(/(\d+(\.\d+)?)/) || [];
    if (match[0]) {
      return parseFloat(match[0]);
    }
    return NaN;
  };

  const getDisplayOrderFromSortFields = (field: string) => {
    const sortOption = SORT_OPTIONS.find(opt => opt.value === field);
    return sortOption ? SORT_OPTIONS.indexOf(sortOption) : Number.MAX_SAFE_INTEGER;
  };

  const groupBanknotes = (banknotes: DetailedBanknote[]) => {
    const grouped = banknotes.reduce((acc: any, banknote) => {
      const sultanName = banknote.sultanName || 'Unknown Sultan';
      if (!acc[sultanName]) {
        acc[sultanName] = [];
      }
      acc[sultanName].push(banknote);
      return acc;
    }, {});

    const sultanGroups = Object.entries(grouped).map(([sultanName, items]) => ({
      sultanName,
      items,
    }));

    sultanGroups.forEach(sultanGroup => {
      sultanGroup.items.sort((a: DetailedBanknote, b: DetailedBanknote) => {
        if (sortFields.length > 0) {
          const primarySort = filters.sort?.[0];
          let aField = "";
          let bField = "";
          
          if (primarySort === "faceValue" || primarySort === "currency" || primarySort === "denomination") {
            aField = a.denomination || "";
            bField = b.denomination || "";
          } else {
            aField = a[primarySort as keyof DetailedBanknote]?.toString() || "";
            bField = b[primarySort as keyof DetailedBanknote]?.toString() || "";
          }
          
          const aOrder = getDisplayOrderFromSortFields(aField);
          const bOrder = getDisplayOrderFromSortFields(bField);
          
          if (aOrder !== bOrder) {
            return aOrder - bOrder;
          }
        }
        
        const aOrder = getCurrencyOrder(a.denomination);
        const bOrder = getCurrencyOrder(b.denomination);
        if (aOrder !== bOrder) return aOrder - bOrder;

        const aVal = parseFaceValue(a.denomination);
        const bVal = parseFaceValue(b.denomination);
        if (!isNaN(aVal) && !isNaN(bVal)) return aVal - bVal;
        
        return (a.denomination || "").localeCompare(b.denomination || "");
      });
    });

    sultanGroups.sort((a, b) => a.sultanName.localeCompare(b.sultanName));

    return { sultanGroups };
  };

  const filteredBanknotes = banknotes.filter(banknote => {
    const searchTerm = searchQuery.toLowerCase();
    return (
      banknote.denomination?.toLowerCase().includes(searchTerm) ||
      banknote.sultanName?.toLowerCase().includes(searchTerm) ||
      banknote.extendedPickNumber?.toLowerCase().includes(searchTerm)
    );
  });

  const { sultanGroups } = groupBanknotes(filteredBanknotes);
  const sortFields = filters.sort || [];

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedSort = e.target.value;
    setFilters(prev => ({ ...prev, sort: [selectedSort] }));
  };

  return (
    <div className="page-container max-w-7xl mx-auto py-10">
      <div className="mb-8 flex justify-between items-center">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {country && (
          <h1 className="text-3xl font-bold tracking-tight">{country.name} Banknotes</h1>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle><Skeleton className="h-5 w-4/5" /></CardTitle>
                <CardDescription><Skeleton className="h-4 w-3/5" /></CardDescription>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
                <div className="mt-2 space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by denomination or sultan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="sort" className="text-sm font-medium text-muted-foreground">
                Sort by
              </Label>
              <select
                id="sort"
                className="flex h-9 w-[220px] appearance-none items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                onChange={handleSortChange}
                value={filters.sort?.[0] || ''}
              >
                <option value="">None</option>
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          {sultanGroups.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-lg text-muted-foreground">No banknotes found for this country.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {sultanGroups.map((group) => (
                <div key={group.sultanName} className="space-y-4">
                  <h2 className="text-2xl font-semibold">{group.sultanName}</h2>
                  <BanknoteGrid banknotes={group.items as DetailedBanknote[]} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CountryDetail;
