import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import CountrySelection from '@/pages/CountrySelection';
import CountryCollectionTabs from '@/components/profile/CountryCollectionTabs';
import { CountryHeader } from '../country/CountryHeader';
import { fetchCountryById, fetchCountryByName } from '@/services/countryService';
import { CountryHeaderCollection } from '../country/CountryHeaderCollection';
import CountryDetailCollection from '@/pages/CountryDetailCollection';

interface ProfileCountrySelectionProps {
  userId: string;
  isOwnProfile: boolean;
  selectedCountry: string | null; // country ID
  showCountryDetail: boolean;
  profileId: string;
  onCountrySelect: (countryId: string, countryName: string) => void;
  onBackToCountries: () => void;
  profileView?: boolean;
  profile?: {
    id: string;
    username: string;
    avatarUrl?: string;
    rank?: string;
  };
}

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
  const { t } = useTranslation(['profile']);
  // State for country name (after lookup, if necessary)
  const [countryName, setCountryName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Scroll position management for smooth loading
  useEffect(() => {
    // Keep page at top during loading
    if (isLoading) {
      window.scrollTo(0, 0);
    }
  }, [isLoading]);

  // When selectedCountry changes, fetch the country name for display
  useEffect(() => {
    if (selectedCountry && showCountryDetail) {
      setIsLoading(true);
      fetchCountryById(selectedCountry).then(countryData => {
        if (countryData) {
          setCountryName(countryData.name);
        }
        setIsLoading(false);
      }).catch(() => {
        setIsLoading(false);
      });
    } else {
      setCountryName(null);
      setIsLoading(false);
    }
  }, [selectedCountry, showCountryDetail]);

  // Updated handler to match CountrySelection's expected type
  const handleCountrySelect = (country: string) => {
    // First fetch the country by name to get its ID
    fetchCountryByName(country).then(countryData => {
      if (countryData) {
        onCountrySelect(countryData.id, countryData.name);
      }
    });
  };

  // Show loading state if we're supposed to show country detail but don't have the country name yet
  if (showCountryDetail && selectedCountry && !countryName && isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
      </div>
    );
  }

  // Don't render anything if we're supposed to show country detail but don't have the required data
  if (showCountryDetail && (!selectedCountry || !countryName)) {
    return null;
  }

  return showCountryDetail && selectedCountry && countryName ? (
    <div >
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
      customTitle={`${isOwnProfile ? t('countrySelection.myCollection') : t('countrySelection.userCollection', { username: userId })}`}
      customDescription={t('countrySelection.browseCollectionByCountry')}
      userId={userId}
      onCountrySelect={handleCountrySelect}
    />
  );
};

export default ProfileCountrySelection;
