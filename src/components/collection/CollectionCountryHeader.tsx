
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchUserProfile } from "@/services/profileService";

interface CollectionCountryHeaderProps {
  countryName: string;
  userId?: string;
}

export const CollectionCountryHeader: React.FC<CollectionCountryHeaderProps> = ({ 
  countryName,
  userId
}) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState<string>("User");
  
  useEffect(() => {
    const loadUserData = async () => {
      if (!userId) return;
      
      try {
        const userProfile = await fetchUserProfile(userId);
        if (userProfile) {
          setUsername(userProfile.username);
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
      }
    };
    
    loadUserData();
  }, [userId]);
  
  const handleBackClick = () => {
    if (userId) {
      navigate(`/profile/${userId}/collection`);
    } else {
      navigate('/collection');
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleBackClick} 
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold">
          {userId ? `${username}'s Collection` : 'My Collection'}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-medium text-muted-foreground">
          {countryName || "Unknown Country"}
        </h2>
      </div>
    </div>
  );
};
