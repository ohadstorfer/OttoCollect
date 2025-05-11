import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchBanknoteById } from '@/services/catalogService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from '@/components/ui/badge';
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Link2, ExternalLink } from 'lucide-react';
import { SITE_URL } from '@/config';

const BanknoteCatalogDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [countryParam, setCountryParam] = useState<string | null>(null);

  const {
    data: banknote,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['banknote', id],
    queryFn: () => fetchBanknoteById(id || ''),
    enabled: !!id,
  });

  useEffect(() => {
    if (banknote && banknote.countries) {
      const countries = banknote.countries;
      setCountryParam(Array.isArray(countries) ? countries[0] : countries);
    }
  }, [banknote]);

  if (isLoading) {
    return <p>Loading banknote details...</p>;
  }

  if (error || !banknote) {
    return <p>Error: Could not load banknote details.</p>;
  }

  const handleCountryClick = () => {
    if (countryParam) {
      navigate(`/catalog/${countryParam}`);
    }
  };

  return (
    <div className="page-container max-w-4xl mx-auto py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{banknote.denomination} {banknote.currency_name}</CardTitle>
          <CardDescription>
            <div className="flex items-center space-x-2">
              <span>{banknote.country}</span>
              <Button variant="link" onClick={handleCountryClick}>
                <Link2 className="h-4 w-4 mr-2" />
                View All {banknote.country} Banknotes
              </Button>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <img
              src={banknote.image_url}
              alt={`${banknote.denomination} ${banknote.currency_name}`}
              className="rounded-md shadow-md"
            />
            <div>
              <p>
                <strong>Year:</strong> {banknote.year}
              </p>
              <p>
                <strong>Category:</strong> {banknote.category}
              </p>
              <p>
                <strong>Type:</strong> {banknote.type}
              </p>
              <p>
                <strong>Value:</strong> {banknote.value}
              </p>
              <p>
                <strong>Grade:</strong> {banknote.grade}
              </p>
              <p>
                <strong>Series:</strong> {banknote.series}
              </p>
              <p>
                <strong>Printer:</strong> {banknote.printer}
              </p>
              <p>
                <strong>Signature:</strong> {banknote.signature}
              </p>
              <p>
                <strong>Comments:</strong> {banknote.comments}
              </p>
              <p>
                <strong>Prefix:</strong> {banknote.prefix}
              </p>
              <p>
                <strong>Suffix:</strong> {banknote.suffix}
              </p>
              <p>
                <strong>Note:</strong> {banknote.note}
              </p>
              <p>
                <strong>Obverse Description:</strong> {banknote.obverse_description}
              </p>
              <p>
                <strong>Reverse Description:</strong> {banknote.reverse_description}
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button asChild>
            <a href={`${SITE_URL}/catalog/${banknote.country}`} target="_blank" rel="noopener noreferrer">
              View on Ottoman Numismatics <ExternalLink className="h-4 w-4 ml-2" />
            </a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default BanknoteCatalogDetail;
