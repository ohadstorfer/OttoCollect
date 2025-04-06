
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OTTOMAN_REGIONS } from "@/lib/constants";
import BanknoteDetailCard from "@/components/banknotes/BanknoteDetailCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Banknote } from "@/types";
import { fetchBanknotes, fetchBanknotesByPeriod, checkBanknotesExist } from "@/services/banknoteService";
import { useToast } from "@/hooks/use-toast";

const Catalog = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [region, setRegion] = useState<string>("all");
  const [yearStart, setYearStart] = useState<string>("");
  const [yearEnd, setYearEnd] = useState<string>("");
  const [banknotes, setBanknotes] = useState<Banknote[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataExists, setDataExists] = useState(true); // Assuming data exists by default
  const { toast } = useToast();

  // First check if any banknotes exist in the database
  useEffect(() => {
    const checkForData = async () => {
      console.log("Checking if banknotes exist in the database...");
      const exists = await checkBanknotesExist();
      console.log("Do banknotes exist in the database?", exists);
      setDataExists(exists);
    };
    
    checkForData();
  }, []);

  // Fetch banknotes on component mount
  useEffect(() => {
    const loadBanknotes = async () => {
      console.log("Loading banknotes from the database...");
      setLoading(true);
      try {
        const data = await fetchBanknotes();
        console.log("Banknotes loaded:", data.length);
        setBanknotes(data);
      } catch (error) {
        console.error("Error loading banknotes:", error);
        toast({
          title: "Error",
          description: "Failed to load banknote catalog. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadBanknotes();
  }, [toast]);

  const handlePeriodChange = async (periodValue: string) => {
    console.log("Period changed to:", periodValue);
    setLoading(true);
    try {
      let data: Banknote[] = [];
      
      switch (periodValue) {
        case "early":
          console.log("Fetching early period banknotes (1863-1914)");
          data = await fetchBanknotesByPeriod(1863, 1914);
          break;
        case "middle":
          console.log("Fetching middle period banknotes (1915-1923)");
          data = await fetchBanknotesByPeriod(1915, 1923);
          break;
        case "late":
          console.log("Fetching late period banknotes (1924-1927)");
          data = await fetchBanknotesByPeriod(1924, 1927);
          break;
        case "all":
        default:
          console.log("Fetching all banknotes");
          data = await fetchBanknotes();
          break;
      }
      
      console.log(`Received ${data.length} banknotes for period ${periodValue}`);
      setBanknotes(data);
    } catch (error) {
      console.error("Error loading banknotes for period:", error);
      toast({
        title: "Error",
        description: "Failed to load banknotes for the selected period.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter the banknotes based on search query and filters
  const filteredBanknotes = banknotes.filter(banknote => {
    // Only include approved banknotes
    if (!banknote.isApproved || banknote.isPending) return false;

    // Filter by search query
    const matchesSearch = searchQuery
      ? banknote.catalogId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        banknote.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        banknote.denomination.toLowerCase().includes(searchQuery.toLowerCase()) ||
        banknote.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        banknote.year.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    // Filter by region
    const matchesRegion = region && region !== "all" ? banknote.country === region : true;

    // Filter by year range
    const year = parseInt(banknote.year);
    const start = yearStart ? parseInt(yearStart) : 0;
    const end = yearEnd ? parseInt(yearEnd) : 9999;
    const matchesYear = !isNaN(year) ? (year >= start && year <= end) : true;

    return matchesSearch && matchesRegion && matchesYear;
  });

  console.log("Filtered banknotes count:", filteredBanknotes.length);

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Ottoman Banknote Catalog</h1>

      {!dataExists ? (
        <div className="bg-amber-100 text-amber-800 p-4 rounded-lg mb-6">
          <h3 className="font-medium text-lg">No Banknote Data</h3>
          <p>The database doesn't have any banknotes yet. If you're an admin, please import the CSV data.</p>
        </div>
      ) : null}

      <div className="bg-card border rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="search" className="mb-2 block">Search</Label>
            <Input
              id="search"
              placeholder="Search by name, country, etc."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="region" className="mb-2 block">Region</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger>
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {OTTOMAN_REGIONS.map((region) => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="yearStart" className="mb-2 block">From Year</Label>
            <Input
              id="yearStart"
              placeholder="From year"
              value={yearStart}
              onChange={(e) => setYearStart(e.target.value)}
              type="number"
            />
          </div>

          <div>
            <Label htmlFor="yearEnd" className="mb-2 block">To Year</Label>
            <Input
              id="yearEnd"
              placeholder="To year"
              value={yearEnd}
              onChange={(e) => setYearEnd(e.target.value)}
              type="number"
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue="all" onValueChange={handlePeriodChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Banknotes</TabsTrigger>
          <TabsTrigger value="early">Early Period (1863-1914)</TabsTrigger>
          <TabsTrigger value="middle">Middle Period (1915-1923)</TabsTrigger>
          <TabsTrigger value="late">Late Period (1924-1927)</TabsTrigger>
        </TabsList>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
          </div>
        ) : filteredBanknotes.length === 0 ? (
          <div className="text-center py-8">
            <h3 className="text-xl font-medium mb-4">No banknotes found</h3>
            <p className="text-muted-foreground">
              {dataExists 
                ? "Try adjusting your filters or search criteria." 
                : "No banknote data has been imported yet."}
            </p>
          </div>
        ) : (
          <TabsContent value="all">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredBanknotes.map((banknote) => (
                <BanknoteDetailCard
                  key={banknote.id}
                  banknote={banknote}
                  source="catalog"
                />
              ))}
            </div>
          </TabsContent>
        )}
        
        <TabsContent value="early">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredBanknotes.map((banknote) => (
              <BanknoteDetailCard
                key={banknote.id}
                banknote={banknote}
                source="catalog"
              />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="middle">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredBanknotes.map((banknote) => (
              <BanknoteDetailCard
                key={banknote.id}
                banknote={banknote}
                source="catalog"
              />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="late">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredBanknotes.map((banknote) => (
              <BanknoteDetailCard
                key={banknote.id}
                banknote={banknote}
                source="catalog"
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Catalog;
