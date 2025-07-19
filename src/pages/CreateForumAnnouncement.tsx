import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CreateAnnouncementForm } from "@/components/forum/CreateAnnouncementForm";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft } from "lucide-react";

export default function CreateForumAnnouncement() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect if user is not logged in or not an admin
  if (!user) {
    return (
      <div className="container py-8">
        <div className="ottoman-card p-8 text-center max-w-xl mx-auto">
          <h2 className="text-2xl font-serif mb-4"><span>Authentication Required</span></h2>
          <p className="mb-6 text-muted-foreground">
            You must be signed in to create announcements.
          </p>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </div>
    );
  }

  // Check if user is Super Admin
  const isSuperAdmin = user.role === 'Super Admin';
  if (!isSuperAdmin) {
    return (
      <div className="container py-8">
        <div className="ottoman-card p-8 text-center max-w-xl mx-auto">
          <h2 className="text-2xl font-serif mb-4"><span>Access Denied</span></h2>
          <p className="mb-6 text-muted-foreground">
            Only Super Admins can create announcements.
          </p>
          <Button onClick={() => navigate('/community/forum')}>Back to Forum</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Button 
        variant="ghost" 
        onClick={() => navigate('/community/forum')}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Forum
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-serif">Create New Announcement</h1>
        <p className="text-muted-foreground mt-2">
          Share important information with the entire community
        </p>
      </div>

      <CreateAnnouncementForm />
    </div>
  );
}