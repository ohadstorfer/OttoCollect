import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import CountrySelection from '@/pages/CountrySelection';
import CountryCollectionTabs from '@/components/profile/CountryCollectionTabs';
import { CountryHeader } from '../country/CountryHeader';
import { fetchCountryById, fetchCountryByName } from '@/services/countryService'; // assuming you have this

interface ProfileCountrySelectionProps {
  userId: string;
  isOwnProfile: boolean;
  selectedCountry: string | null; // previous: could be either country name or id, but let's clarify!
  showCountryDetail: boolean;
  profileId: string;
  onCountrySelect: (country: string) => void; // update stays
  onBackToCountries: () => void;
  profileView?: boolean;
}

// We'll keep a local state to store both the country ID and name when selected
const ProfileCountrySelection: React.FC<ProfileCountrySelectionProps> = ({
  userId,
  isOwnProfile,
  selectedCountry,
  showCountryDetail,
  profileId,
  onCountrySelect,
  onBackToCountries,
  profileView = true,
}) => {
  // State for both country ID and countryName (after lookup, if necessary)
  const [countryId, setCountryId] = useState<string | null>(null);
  const [countryName, setCountryName] = useState<string | null>(null);

  // Debug log for userId passed through props
  React.useEffect(() => {
    console.log("[DEBUG][ProfileCountrySelection] userId prop =", userId, "| typeof =", typeof userId);
  }, [userId]);

  // On mount (or when selectedCountry changes), resolve both countryId and countryName
  useEffect(() => {
    // If selectedCountry is null, reset both
    if (!selectedCountry) {
      setCountryId(null);
      setCountryName(null);
      return;
    }
    // If it's already a UUID, we'll assume that
    const isUuid = /^[0-9a-fA-F-]{36}$/.test(selectedCountry);

    if (isUuid) {
      setCountryId(selectedCountry);
      // Fetch the country name as well (needed for display)
      fetchCountryById(selectedCountry).then(countryData => {
        if (countryData) setCountryName(countryData.name);
      });
    } else {
      // Otherwise, look up by name to get the ID. Assumes a service exists.
      fetchCountryByName(selectedCountry).then(countryData => {
        if (countryData) {
          setCountryId(countryData.id);
          setCountryName(countryData.name);
        }
      });
    }
  }, [selectedCountry]);

  // Updated handler to pass only the countryId back up, not both
  const handleCountrySelect = (id: string, name: string) => {
    setCountryId(id);
    setCountryName(name);
    onCountrySelect(id); // <-- always just send one string up
  };

  return showCountryDetail && countryId && countryName ? (
    <div>
      <div className="max-w-5xl mx-auto">
        <CountryHeader 
          countryName={countryName} 
          returnPath={'returnPath'} 
          hideBackButton={profileView}
        />
        <Button 
          variant="ghost" 
          onClick={onBackToCountries}
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Countries
        </Button>
      </div>
      <CountryCollectionTabs
        userId={userId}
        countryId={countryId}
        countryName={countryName}
        isOwner={isOwnProfile}
      />
    </div>
  ) : (
    <CountrySelection 
      showHeader={false}
      customTitle={`${isOwnProfile ? 'My' : `${userId}'s`} Collection`}
      customDescription="Browse your banknote collection by country"
      userId={userId}
      onCountrySelect={handleCountrySelect}
    />
  );
};

export default ProfileCountrySelection;
