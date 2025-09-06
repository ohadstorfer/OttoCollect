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
  selectedCountryName: string | null; // country name
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
  selectedCountryName,
  showCountryDetail,
  profileId,
  onCountrySelect,
  onBackToCountries,
  profileView = true,
  profile
}) => {
  const { t } = useTranslation(['profile']);
  // State for country name (after lookup, if necessary)
  const [countryName, setCountryName] = useState<string | null>(selectedCountryName);
  const [isLoading, setIsLoading] = useState(false);

  // Scroll position management for smooth loading
  useEffect(() => {
    // Keep page at top during loading
    if (isLoading) {
      window.scrollTo(0, 0);
    }
  }, [isLoading]);

  // Handle country name updates - prioritize selectedCountryName prop
  useEffect(() => {
    if (selectedCountryName) {
      // Use the passed country name immediately
      setCountryName(selectedCountryName);
      setIsLoading(false);
    } else if (selectedCountry && showCountryDetail) {
      // Fallback: fetch country name if not provided
      setCountryName(null);
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
  }, [selectedCountry, selectedCountryName, showCountryDetail]);

  // Handler for country selection with ID and name (no API call needed)
  const handleCountrySelectWithId = (countryId: string, countryName: string) => {
    // Call the parent handler immediately with both ID and name
    onCountrySelect(countryId, countryName);
  };

  // Show country collection immediately when selected, with loading state inside
  if (showCountryDetail && selectedCountry) {
    return (
      <div>
        {isLoading || !countryName ? (
          // Show loading state within the country collection view
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600 mb-4"></div>
            <p className="text-muted-foreground">Loading collection...</p>
          </div>
        ) : (
          // Show the actual country collection
          <CountryDetailCollection 
            userId={userId} 
            countryName={countryName}
            profileView={true}
            onBackToCountries={onBackToCountries}
            profileData={profile}
          />
        )}
      </div>
    );
  }

  // Show country selection when no country is selected
  return (
    <CountrySelection 
      showHeader={false}
      customTitle={`${isOwnProfile ? t('countrySelection.myCollection') : t('countrySelection.userCollection', { username: userId })}`}
      customDescription={t('countrySelection.browseCollectionByCountry')}
      userId={userId}
      onCountrySelectWithId={handleCountrySelectWithId}
    />
  );
};

export default ProfileCountrySelection;
