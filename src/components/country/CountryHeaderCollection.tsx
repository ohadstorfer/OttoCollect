
import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { RTLArrow } from '@/components/common/RTLArrow';

interface CountryHeaderProps {
  countryName: string;
  returnPath?: string;
  hideBackButton?: boolean; // New prop to control back button visibility
}

export const CountryHeaderCollection: React.FC<CountryHeaderProps> = ({ 
  countryName,
  returnPath = '/catalog', // Default to catalog if not specified
  hideBackButton = false // Default to showing the back button
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation(['navigation', 'catalog']);

  const handleBack = () => {
    navigate(returnPath);
  };

  return (
    <div className="flex items-center gap-4 mb-1">
      {!hideBackButton && (
        <Button variant="ghost" onClick={handleBack} className="p-2">
          <RTLArrow direction="left" className="h-5 w-5" />
        </Button>
      )}
      <h1 className="text-2xl font-bold">
        <span>{t('catalog:country.collection', { country: countryName })}</span>
      </h1>
    </div>
  );
};
