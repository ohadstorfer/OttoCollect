import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { useAuth } from '@/context/AuthContext';
import { ProfileEditForm } from '@/components/profile/ProfileEditForm';
import ProfileCountrySelection from '@/components/profile/ProfileCountrySelection';
import { useTheme } from "@/context/ThemeContext";
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { User } from '@/types';

interface UserProfileDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UserProfileDialog: React.FC<UserProfileDialogProps> = ({
  user,
  open,
  onOpenChange
}) => {
  // Move all hooks to the top, before any conditional logic
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const { theme } = useTheme();
  const [selectedCountry, setSelectedCountry] = React.useState<string | null>(null);
  const [showCountryDetail, setShowCountryDetail] = React.useState(false);
  const [isEditingProfile, setIsEditingProfile] = React.useState(false);

  // Move useMemo before any conditional returns
  const isOwnProfile = React.useMemo(() => {
    if (!user || !authUser) return false;
    return authUser.id === user.id;
  }, [authUser, user]);

  const handleCountrySelect = (countryId: string, countryName: string) => {
    setSelectedCountry(countryId);
    setShowCountryDetail(true);
  };

  const handleBackToCountries = () => {
    setShowCountryDetail(false);
    setSelectedCountry(null);
  };

  const handleSaveComplete = () => {
    setIsEditingProfile(false);
    onOpenChange(false);
  };

  // Early return after all hooks are defined
  if (!user) return null;

  // Render profile edit form if editing and is owner
  if (isEditingProfile && isOwnProfile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <ProfileEditForm
            profile={user}
            onCancel={() => setIsEditingProfile(false)}
            onSaveComplete={handleSaveComplete}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:w-[80vw] sm:max-w-[80vw] max-h-[90vh] overflow-y-auto">

        <div>
          <section className={`${theme === 'light' ? 'bg-ottoman-100/50' : 'bg-dark-600'} py-0 sm:py-6 relative overflow-hidden`}>
            <div className="w-[90%] sm:w-[92%] mx-auto py-5">
              <ProfileHeader 
                profile={user} 
                isEditingProfile={isEditingProfile} 
                onEditProfileClick={() => setIsEditingProfile(true)}
              />
            </div>
          </section>

          {/* Directly render the country selection/collection view */}
          <div className="mt-4">
            {authUser ? (
              <ProfileCountrySelection
                userId={user.id}
                isOwnProfile={isOwnProfile}
                selectedCountry={selectedCountry}
                showCountryDetail={showCountryDetail}
                onCountrySelect={handleCountrySelect}
                onBackToCountries={handleBackToCountries}
                profileId={user.id}
                profile={user}
              />
            ) : (
              <div className="flex justify-center w-full mb-4">
                <Card className="p-8 text-center bg-card w-[90%] sm:w-[600px]">
                  <h3 className="text-2xl font-semibold mb-4">Authentication Required</h3>
                  <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                    To view this collector's profile and their banknote collection, please log in to your account. 
                    If you don't have an account yet, join our community to explore collections and connect with fellow collectors.
                  </p>
                  <div className="flex justify-center">
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={() => {
                        onOpenChange(false);
                        navigate('/auth?mode=login');
                      }}
                      className="font-semibold"
                    >
                      Log In
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileDialog; 