import React from "react";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogIn, MessageCircle, Users, BookOpen, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function Community() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const communityFeatures = [
    {
      title: "Messages",
      description: "Chat with other collectors and sellers",
      icon: <MessageCircle className="h-8 w-8 text-ottoman-500" />,
      action: () => navigate('/messaging'),
      buttonText: "Go to Messages"
    },
    {
      title: "Members",
      description: "Browse other collectors and view their profiles",
      icon: <Users className="h-8 w-8 text-ottoman-500" />,
      action: () => navigate('/members'),
      buttonText: "Browse Members",
      comingSoon: false
    },
    {
      title: "Forum",
      description: "Discuss banknotes and collecting strategies",
      icon: <BookOpen className="h-8 w-8 text-ottoman-500" />,
      action: () => navigate('/community/forum'),
      buttonText: "Visit Forum",
      comingSoon: false
    },
    {
      title: "Badges",
      description: "Earn badges for your collecting achievements",
      icon: <Award className="h-8 w-8 text-ottoman-500" />,
      action: () => {},
      buttonText: "View Badges",
      comingSoon: true
    }
  ];

  if (!user) {
    return (
      <div className="page-container">
        <h1 className="page-title"><span>Community</span></h1>
        
        <div className="max-w-2xl mx-auto text-center">
          <div className="ottoman-card p-8 flex flex-col items-center">
            <h2 className="text-2xl font-serif mb-4"><span>Join the Community</span></h2>
            <p className="mb-6 text-muted-foreground">
              Please sign in to access community features including messaging, forums, and more.
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
      <h1 className="page-title"><span>Community</span></h1>
      
      <div className="flex flex-col mb-10">
        <p className="text-muted-foreground mb-6">
          Connect with other collectors, share knowledge, and grow your collection through community engagement.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {communityFeatures.map((feature) => (
            <Card key={feature.title} className="border shadow-md">
              <CardHeader className="flex flex-row items-center gap-4">
                {feature.icon}
                <div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  {feature.comingSoon && (
                    <span className="inline-flex items-center rounded-md bg-ottoman-900/20 px-2 py-1 text-xs font-medium text-ottoman-300 ring-1 ring-inset ring-ottoman-700/30">
                      Coming soon
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{feature.description}</p>
                <Button 
                  onClick={feature.action} 
                  variant={feature.comingSoon ? "outline" : "default"}
                  disabled={feature.comingSoon}
                >
                  {feature.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
