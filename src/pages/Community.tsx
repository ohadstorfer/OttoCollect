
import React, { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { MessageCenter } from "@/components/messages/MessageCenter";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Community() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="page-container">
        <h1 className="page-title">Community</h1>
        
        <div className="max-w-2xl mx-auto text-center">
          <div className="ottoman-card p-8 flex flex-col items-center">
            <h2 className="text-2xl font-serif mb-4">Join the Community</h2>
            <p className="mb-6 text-muted-foreground">
              Please sign in to access community features including messaging with other collectors.
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
      <h1 className="page-title">Community</h1>
      
      <div className="flex flex-col mb-10">
        <h2 className="section-title flex items-center">
          Messaging
        </h2>
        <Separator className="mb-4" />
        
        <MessageCenter />
      </div>
    </div>
  );
}
