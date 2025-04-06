
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MOCK_BANKNOTES, OTTOMAN_REGIONS } from "@/lib/constants";
import BanknoteDetailCard from "@/components/banknotes/BanknoteDetailCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Catalog = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [region, setRegion] = useState<string>("");
  const [yearStart, setYearStart] = useState<string>("");
  const [yearEnd, setYearEnd] = useState<string>("");

  const filteredBanknotes = MOCK_BANKNOTES.filter(banknote => {
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
    const matchesRegion = region ? banknote.country === region : true;

    // Filter by year range
    const year = parseInt(banknote.year);
    const start = yearStart ? parseInt(yearStart) : 0;
    const end = yearEnd ? parseInt(yearEnd) : 9999;
    const matchesYear = year >= start && year <= end;

    return matchesSearch && matchesRegion && matchesYear;
  });

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Ottoman Banknote Catalog</h1>

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
                <SelectItem value="">All Regions</SelectItem>
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

      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Banknotes</TabsTrigger>
          <TabsTrigger value="early">Early Period (1863-1914)</TabsTrigger>
          <TabsTrigger value="middle">Middle Period (1915-1923)</TabsTrigger>
          <TabsTrigger value="late">Late Period (1924-1927)</TabsTrigger>
        </TabsList>
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
        <TabsContent value="early">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredBanknotes
              .filter(banknote => {
                const year = parseInt(banknote.year);
                return year >= 1863 && year <= 1914;
              })
              .map((banknote) => (
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
            {filteredBanknotes
              .filter(banknote => {
                const year = parseInt(banknote.year);
                return year >= 1915 && year <= 1923;
              })
              .map((banknote) => (
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
            {filteredBanknotes
              .filter(banknote => {
                const year = parseInt(banknote.year);
                return year >= 1924 && year <= 1927;
              })
              .map((banknote) => (
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
