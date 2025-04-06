
import React from "react";
import { User } from "@/types";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { MessageCircle, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SendMessage } from "@/components/messages/SendMessage";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

interface ProfileAboutProps {
  profile: User;
  onEditClick?: () => void;
}

export function ProfileAbout({ profile, onEditClick }: ProfileAboutProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showMessageDialog, setShowMessageDialog] = React.useState(false);
  
  const isOwnProfile = user && user.id === profile.id;
  
  const handleMessageClick = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setShowMessageDialog(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">About</CardTitle>
          {isOwnProfile && onEditClick && (
            <Button variant="outline" size="sm" onClick={onEditClick}>
              <Edit className="h-4 w-4 mr-1" /> Edit Profile
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {profile.about ? (
            <p className="whitespace-pre-wrap">{profile.about}</p>
          ) : (
            <p className="text-muted-foreground italic">
              This user hasn't added any information about themselves yet.
            </p>
          )}
        </CardContent>
        
        {!isOwnProfile && user && (
          <CardFooter className="pt-4 border-t">
            <Button 
              variant="default"
              className="w-full"
              onClick={handleMessageClick}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </CardFooter>
        )}
      </Card>
      
      {!isOwnProfile && user && (
        <SendMessage
          receiverId={profile.id}
          receiverName={profile.username}
          isOpen={showMessageDialog}
          onOpenChange={setShowMessageDialog}
        />
      )}
    </>
  );
}
