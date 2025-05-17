
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import CountrySelection from '@/pages/CountrySelection';
import CountryCollectionTabs from '@/components/profile/CountryCollectionTabs';
import { useQuery } from "@tanstack/react-query";
import { fetchBanknotesByCountryId } from "@/services/banknoteService";

interface ProfileCountrySelectionProps {
  userId: string;
  isOwnProfile: boolean;
  selectedCountry: string | null; // countryId (UUID)
  showCountryDetail: boolean;
  profileId: string;
  onCountrySelect: (country: string) => void;
  onBackToCountries: () => void;
}

const ProfileCountrySelection: React.FC<ProfileCountrySelectionProps> = ({
  userId,
  isOwnProfile,
  selectedCountry,
  showCountryDetail,
  profileId,
  onCountrySelect,
  onBackToCountries,
}) => {
  // Find countryName based on selectedCountry id, only if detail is shown and selectedCountry exists
  const { data: countryBanknotes } = useQuery({
    queryKey: ['country-banknotes', selectedCountry],
    queryFn: () =>
      selectedCountry ? fetchBanknotesByCountryId(selectedCountry) : Promise.resolve([]),
    enabled: !!selectedCountry && showCountryDetail,
  });

  // Try to fetch country name from the first available banknote result
  const countryName =
    showCountryDetail &&
    selectedCountry &&
    Array.isArray(countryBanknotes) &&
    countryBanknotes.length > 0
      ? countryBanknotes[0].country
      : null;

  return showCountryDetail && selectedCountry ? (
    <div>
      <div className="max-w-5xl mx-auto">
        <Button variant="ghost" onClick={onBackToCountries}>
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Countries
        </Button>
      </div>
      {/* countryId: selectedCountry, countryName is inferred above */}
      <CountryCollectionTabs
        userId={userId}
        countryId={selectedCountry}
        countryName={countryName || ''}
        isOwner={isOwnProfile}
      />
    </div>
  ) : (
    <CountrySelection
      showHeader={false}
      customTitle={`${isOwnProfile ? 'My' : `${userId}'s`} Collection`}
      customDescription="Browse your banknote collection by country"
      userId={userId}
      onCountrySelect={onCountrySelect}
    />
  );
};

export default ProfileCountrySelection;
