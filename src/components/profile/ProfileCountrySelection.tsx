
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import CountrySelection from '@/pages/CountrySelection';
import CountryCollectionTabs from '@/components/profile/CountryCollectionTabs';

interface ProfileCountrySelectionProps {
  userId: string;
  isOwnProfile: boolean;
  selectedCountry: string | null;
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
  onBackToCountries
}) => {
  return showCountryDetail && selectedCountry ? (
    <div>
      <div className="page-container max-w-5xl mx-auto">
        <Button 
          variant="outline" 
          onClick={onBackToCountries} 
          className="mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Countries
        </Button>
      </div>
      
      <CountryCollectionTabs
        userId={userId}
        countryId={selectedCountry} 
        countryName={selectedCountry}
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
