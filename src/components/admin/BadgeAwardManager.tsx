
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Award, Play, CheckCircle } from 'lucide-react';
import { awardHistoricalBadges, awardBadgesForSpecificUser } from '@/services/badgeAwardService';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const BadgeAwardManager = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingSpecific, setIsProcessingSpecific] = useState(false);
  const [specificUserId, setSpecificUserId] = useState('');
  const [processComplete, setProcessComplete] = useState(false);
  const [specificComplete, setSpecificComplete] = useState(false);

  const handleAwardHistoricalBadges = async () => {
    try {
      setIsProcessing(true);
      setProcessComplete(false);
      console.log('Starting historical badge award process...');
      
      await awardHistoricalBadges();
      
      setProcessComplete(true);
      console.log('Historical badge award process completed successfully');
    } catch (error) {
      console.error('Error during badge award process:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAwardSpecificUser = async () => {
    if (!specificUserId.trim()) {
      console.error('User ID is required');
      return;
    }

    try {
      setIsProcessingSpecific(true);
      setSpecificComplete(false);
      
      await awardBadgesForSpecificUser(specificUserId.trim());
      
      setSpecificComplete(true);
      console.log('Specific user badge award completed');
    } catch (error) {
      console.error('Error during specific user badge award:', error);
    } finally {
      setIsProcessingSpecific(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Badge Award Manager
          </CardTitle>
          <CardDescription>
            Award badges to existing users based on their historical actions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Award All Users */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <h3 className="text-lg font-semibold">Award All Users</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              This will check all existing users and award them badges based on their:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Badge variant="outline">Collection Items</Badge>
              <Badge variant="outline">Rare Banknotes</Badge>
              <Badge variant="outline">Forum Posts</Badge>
              <Badge variant="outline">Followers</Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleAwardHistoricalBadges}
                disabled={isProcessing}
                className="flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Award Historical Badges
                  </>
                )}
              </Button>
              
              {processComplete && (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Process completed!</span>
                </div>
              )}
            </div>
          </div>

          {/* Award Specific User */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold">Award Specific User</h3>
            <div className="space-y-2">
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                placeholder="Enter user ID (UUID)"
                value={specificUserId}
                onChange={(e) => setSpecificUserId(e.target.value)}
                className="max-w-md"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleAwardSpecificUser}
                disabled={isProcessingSpecific || !specificUserId.trim()}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isProcessingSpecific ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Award className="h-4 w-4" />
                    Award User Badges
                  </>
                )}
              </Button>
              
              {specificComplete && (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">User badges updated!</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This process will check each user's collection, forum posts, and followers 
              to award appropriate badges. The process may take some time for large numbers of users. 
              Check the browser console for detailed progress logs.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BadgeAwardManager;
