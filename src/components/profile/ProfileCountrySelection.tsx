import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import CountrySelection from '@/pages/CountrySelection';
import CountryCollectionTabs from '@/components/profile/CountryCollectionTabs';
import { CountryHeader } from '../country/CountryHeader';
import { fetchCountryById, fetchCountryByName } from '@/services/countryService'; // assuming you have this
import { CountryHeaderCollection } from '../country/CountryHeaderCollection';
import CountryDetailCollection from '@/pages/CountryDetailCollection';

interface ProfileCountrySelectionProps {
  userId: string;
  isOwnProfile: boolean;
  selectedCountry: string | null; // previous: could be either country name or id, but let's clarify!
  showCountryDetail: boolean;
  profileId: string;
  onCountrySelect: (countryId: string, countryName: string) => void; // update to send both
  onBackToCountries: () => void;
  profileView?: boolean;
  profile?: {
    id: string;
    username: string;
    avatarUrl?: string;
    rank?: string;
  };
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
  profile
}) => {
  // State for both country ID and countryName (after lookup, if necessary)
  const [countryId, setCountryId] = useState<string | null>(null);
  const [countryName, setCountryName] = useState<string | null>(null);

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

  // Updated handler to match CountrySelection's expected type
  const handleCountrySelect = (country: string) => {
    // First fetch the country by name to get its ID
    fetchCountryByName(country).then(countryData => {
      if (countryData) {
        setCountryId(countryData.id);
        setCountryName(countryData.name);
        onCountrySelect(countryData.id, countryData.name);
      }
    });
  };

  return showCountryDetail && countryId && countryName ? (
    <div>
     

      <CountryDetailCollection 
          userId={userId} 
          countryName={countryName}
          profileView={true}
          onBackToCountries={onBackToCountries}
          profileData={profile}
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
