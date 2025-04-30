
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getUserProfile } from "@/services/profileService";
import { fetchUserCollection } from "@/services/collectionService";
import { CollectionItem, User } from "@/types";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CollectionItemCard from "@/components/collection/CollectionItemCard";
import { BanknoteCondition } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";

interface ProfileCollectionProps {
  userId?: string;
  username?: string;
}

export const ProfileCollection: React.FC<ProfileCollectionProps> = ({ userId, username }) => {
  const params = useParams();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  
  // Determine which user ID to use
  const targetUserId = userId || params.userId;
  const targetUsername = username || params.username;
  
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // First, get the user profile
        let userProfile: User | null = null;
        
        if (targetUserId) {
          userProfile = await getUserProfile(targetUserId);
        } else if (targetUsername) {
          // TODO: Implement fetchUserProfileByUsername if needed
          setError("Fetching by username not implemented yet");
          setLoading(false);
          return;
        } else {
          setError("No user ID or username provided");
          setLoading(false);
          return;
        }
        
        if (!userProfile) {
          setError("User not found");
          setLoading(false);
          return;
        }
        
        setUser(userProfile);
        
        // Then, get the user's collection
        const userCollection = await fetchUserCollection(userProfile.id);
        setCollection(userCollection);
        
      } catch (err) {
        console.error("Error loading user data:", err);
        setError("Failed to load user data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    loadUserData();
  }, [targetUserId, targetUsername]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (!user) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>User Not Found</AlertTitle>
        <AlertDescription>The requested user could not be found.</AlertDescription>
      </Alert>
    );
  }
  
  // Filter collection based on active tab
  const filteredItems = collection.filter(item => {
    if (activeTab === "all") return true;
    if (activeTab === "forsale") return item.isForSale;
    
    // Filter by condition
    return item.condition === activeTab;
  });
  
  // Count items by condition
  const conditionCounts: Record<string, number> = {
    all: collection.length,
    forsale: collection.filter(item => item.isForSale).length,
  };
  
  // Add counts for each condition
  const conditions: BanknoteCondition[] = ['UNC', 'AU', 'XF', 'VF', 'F', 'VG', 'G', 'Fair', 'Poor'];
  conditions.forEach(condition => {
    conditionCounts[condition] = collection.filter(item => item.condition === condition).length;
  });
  
  return (
    <div className="space-y-6">
      <Card className={cn(
        "overflow-hidden",
        theme === 'light' ? "bg-white/90" : "bg-dark-600/50"
      )}>
        <CardContent className="p-0">
          <Tabs 
            defaultValue="all" 
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <div className="overflow-x-auto">
              <TabsList className="bg-transparent p-0 h-auto flex w-full justify-start">
                <TabsTrigger 
                  value="all"
                  className={cn(
                    "data-[state=active]:bg-ottoman-600 data-[state=active]:text-white rounded-none border-b-2 border-transparent data-[state=active]:border-ottoman-600 px-4 py-3",
                    theme === 'light' ? "hover:bg-ottoman-100" : "hover:bg-ottoman-900/30"
                  )}
                >
                  All
                  <Badge variant="secondary" className="ml-2">{conditionCounts.all}</Badge>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="forsale"
                  className={cn(
                    "data-[state=active]:bg-ottoman-600 data-[state=active]:text-white rounded-none border-b-2 border-transparent data-[state=active]:border-ottoman-600 px-4 py-3",
                    theme === 'light' ? "hover:bg-ottoman-100" : "hover:bg-ottoman-900/30"
                  )}
                >
                  For Sale
                  <Badge variant="secondary" className="ml-2">{conditionCounts.forsale}</Badge>
                </TabsTrigger>
                
                {conditions.map(condition => (
                  conditionCounts[condition] > 0 && (
                    <TabsTrigger 
                      key={condition}
                      value={condition}
                      className={cn(
                        "data-[state=active]:bg-ottoman-600 data-[state=active]:text-white rounded-none border-b-2 border-transparent data-[state=active]:border-ottoman-600 px-4 py-3",
                        theme === 'light' ? "hover:bg-ottoman-100" : "hover:bg-ottoman-900/30"
                      )}
                    >
                      {condition}
                      <Badge variant="secondary" className="ml-2">{conditionCounts[condition]}</Badge>
                    </TabsTrigger>
                  )
                ))}
              </TabsList>
            </div>
            
            <TabsContent value={activeTab} className="p-4">
              {filteredItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className={theme === 'light' ? "text-ottoman-700" : "text-ottoman-300"}>
                    No banknotes found in this category.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredItems.map(item => (
                    <CollectionItemCard
                      key={item.id}
                      item={item}
                      isPublicView={true}
                      onItemEdit={() => {}}
                      onCollectionUpdated={async () => {}}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
