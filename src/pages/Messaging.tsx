
import React from "react";
import { Separator } from "@/components/ui/separator";
import { MessageCenter } from "@/components/messages/MessageCenter";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Messaging() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="page-container">
        <h1 className="page-title">Messages</h1>
        
        <div className="max-w-2xl mx-auto text-center">
          <div className="ottoman-card p-8 flex flex-col items-center">
            <h2 className="text-2xl font-serif mb-4">Sign In to Access Messages</h2>
            <p className="mb-6 text-muted-foreground">
              Please sign in to access your messages and chat with other collectors.
            </p>
            <Button onClick={() => navigate('/auth')}>
              <LogIn className="mr-2 h-4 w-4" />
              Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">Messages</h1>
      
      <div className="flex flex-col mb-10">
        <p className="text-muted-foreground mb-4">
          Chat with other collectors, discuss banknotes, and arrange trades or purchases.
        </p>
        
        <MessageCenter />
      </div>
    </div>
  );
}
