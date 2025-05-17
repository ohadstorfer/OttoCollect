
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import CountrySelection from '@/pages/CountrySelection';
import CountryCollectionTabs from '@/components/profile/CountryCollectionTabs';
import { CountryHeader } from '../country/CountryHeader';

interface ProfileCountrySelectionProps {
  userId: string;
  isOwnProfile: boolean;
  selectedCountry: string | null;
  showCountryDetail: boolean;
  profileId: string;
  onCountrySelect: (country: string) => void;
  onBackToCountries: () => void;
  profileView?: boolean;
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
}) => {
  return showCountryDetail && selectedCountry ? (
    <div >
      <div className=" max-w-5xl mx-auto">
      <CountryHeader 
        countryName={selectedCountry} 
        returnPath={'returnPath'} 
        hideBackButton={profileView} // Hide the back button when in profile view
      />
      
        <Button 
          variant="ghost" 
          onClick={onBackToCountries} 
          
        >
          <ArrowLeft className="h-5 w-5 mr-2  " />
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
