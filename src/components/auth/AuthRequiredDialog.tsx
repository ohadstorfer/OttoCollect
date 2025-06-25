import { useNavigate } from "react-router-dom";
import { LogIn, ShoppingBag, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface AuthRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  features?: Array<{
    icon: JSX.Element;
    title: string;
    description: string;
  }>;
}

export const AuthRequiredDialog = ({
  open,
  onOpenChange,
  title = "Join Our Community",
  description = "Discover exclusive Ottoman banknotes and connect with collectors worldwide.",
  features = [
    {
      icon: <ShoppingBag className="h-5 w-5 text-ottoman-600 dark:text-ottoman-300" />,
      title: "Access Marketplace",
      description: "View detailed listings and contact sellers"
    },
    {
      icon: <UserPlus className="h-5 w-5 text-ottoman-600 dark:text-ottoman-300" />,
      title: "Join the Community",
      description: "Connect with fellow collectors and enthusiasts"
    }
  ]
}: AuthRequiredDialogProps) => {
  const navigate = useNavigate();

  const handleAuthNavigate = () => {
    onOpenChange(false);
    navigate('/auth');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-center">{title}</DialogTitle>
          <DialogDescription className="text-base pt-2 text-center">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6">
          <div className="space-y-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-ottoman-100 dark:bg-ottoman-900/50 flex items-center justify-center">
                  {feature.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-ottoman-900 dark:text-ottoman-100">{feature.title}</h4>
                  <p className="text-sm text-ottoman-600 dark:text-ottoman-300">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={handleAuthNavigate} 
            className="w-full bg-ottoman-600 hover:bg-ottoman-700 text-white"
            size="lg"
          >
            <LogIn className="mr-2 h-5 w-5" />
            Sign In / Sign Up
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 