
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CountryHeaderProps {
  countryName: string;
  returnPath?: string;
  hideBackButton?: boolean; // New prop to control back button visibility
}

export const CountryHeader: React.FC<CountryHeaderProps> = ({ 
  countryName,
  returnPath = '/catalog', // Default to catalog if not specified
  hideBackButton = false // Default to showing the back button
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(returnPath);
  };

  return (
    <div className="flex items-center gap-4 mb-1">
      {!hideBackButton && (
        <Button variant="ghost" onClick={handleBack} className="p-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      <h1 className="text-3xl font-bold">{countryName} Banknotes</h1>
    </div>
  );
};
