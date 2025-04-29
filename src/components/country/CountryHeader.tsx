
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CountryHeaderProps {
  countryName: string;
}

export const CountryHeader: React.FC<CountryHeaderProps> = ({ countryName }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/catalog');
  };

  return (
    <div className="flex items-center gap-4 mb-6">
      <Button variant="ghost" onClick={handleBack} className="p-2">
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <h1 className="text-3xl font-bold">{countryName} Banknotes</h1>
    </div>
  );
};
