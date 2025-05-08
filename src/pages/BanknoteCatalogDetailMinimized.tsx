
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Info,
  Building,
  Shield,
  CircleDollarSign,
  Map,
  Calendar,
  Hash,
  Users,
  PenTool,
  Stamp,
  FileText,
  History
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import { fetchBanknoteById } from "@/services/banknoteService";
import { useBanknoteContext } from "@/context/BanknoteContext";
import { LabelValuePair } from "@/components/ui/label-value-pair";

const BanknoteCatalogDetailMinimized: React.FC = () => {
  const navigate = useNavigate();
  const { banknoteId } = useBanknoteContext();
  
  // Fetch banknote data using the ID from context
  const { isLoading, error, data: banknote } = useQuery({
    queryKey: ['banknote', banknoteId],
    queryFn: () => fetchBanknoteById(banknoteId || ""),
    enabled: !!banknoteId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle><Skeleton className="h-6 w-64" /></CardTitle>
          <CardDescription><Skeleton className="h-4 w-32" /></CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !banknote) {
    return (
      <Card>
        <CardContent className="text-center py-6">
          <h2 className="text-lg font-semibold mb-2">Error loading banknote details</h2>
          <p className="text-muted-foreground">Please try again later.</p>
        </CardContent>
      </Card>
    );
  }

  // Define detail groups similar to BanknoteCatalogDetail.tsx
  const detailGroups = [
    {
      title: "Basic Information",
      icon: <Info className="h-5 w-5" />,
      fields: [
        { label: "Denomination", value: banknote.denomination, icon: <CircleDollarSign className="h-4 w-4" /> },
        { label: "Country", value: banknote.country, icon: <Map className="h-4 w-4" /> },
        { label: "Islamic Year", value: banknote.islamicYear, icon: <Calendar className="h-4 w-4" /> },
        { label: "Gregorian Year", value: banknote.gregorianYear, icon: <Calendar className="h-4 w-4" /> },
        { label: "Category", value: banknote.category, icon: <Hash className="h-4 w-4" /> },
        { label: "Type", value: banknote.type, icon: <FileText className="h-4 w-4" /> },
        { label: "Sultan", value: banknote.sultanName, icon: <Users className="h-4 w-4" /> },
        { label: "Pick Number", value: banknote.pickNumber, icon: <Hash className="h-4 w-4" /> },
        { label: "Extended Pick", value: banknote.extendedPickNumber, icon: <Hash className="h-4 w-4" /> },
        { label: "Turkish Cat #", value: banknote.turkCatalogNumber, icon: <Hash className="h-4 w-4" /> },
        { label: "Rarity", value: banknote.rarity, icon: <Hash className="h-4 w-4" /> }
      ]
    },
    {
      title: "Production Details",
      icon: <Building className="h-5 w-5" />,
      fields: [
        { label: "Printer", value: banknote.printer, icon: <PenTool className="h-4 w-4" /> },
        { label: "Colors", value: banknote.colors, icon: <PenTool className="h-4 w-4" /> },
        { label: "Serial Numbering", value: banknote.serialNumbering, icon: <Hash className="h-4 w-4" /> }
      ]
    },
    {
      title: "Security Features",
      icon: <Shield className="h-5 w-5" />,
      fields: [
        { label: "Security Elements", value: banknote.securityElement, icon: <Shield className="h-4 w-4" /> },
        { label: "Seal Names", value: banknote.sealNames, icon: <Stamp className="h-4 w-4" /> },
        { label: "Front Signatures", value: banknote.signaturesFront, icon: <Hash className="h-4 w-4" /> },
        { label: "Back Signatures", value: banknote.signaturesBack, icon: <Hash className="h-4 w-4" /> }
      ]
    }
  ];

  return (
    <Card className="border-t-4 border-t-primary shadow-md">
      <CardHeader className="border-b bg-muted/20">
        <CardTitle className="text-xl">Banknote Details</CardTitle>
        <CardDescription>Complete information about this banknote</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <Accordion type="single" collapsible className="w-full space-y-4" defaultValue="item-0">
          {detailGroups.map((group, groupIndex) => (
            <AccordionItem 
              key={`item-${groupIndex}`} 
              value={`item-${groupIndex}`}
              className="border rounded-md px-2"
            >
              <AccordionTrigger className="hover:no-underline px-4">
                <div className="flex items-center gap-2">
                  {group.icon}
                  <span className="font-medium">{group.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2">
                  {group.fields
                    .filter(field => field.value !== null && field.value !== undefined)
                    .map((field, fieldIndex) => (
                      <LabelValuePair
                        key={fieldIndex}
                        label={field.label}
                        value={field.value}
                        icon={field.icon}
                      />
                    ))}
                  {!group.fields.some(field => field.value !== null && field.value !== undefined) && (
                    <p className="text-sm text-muted-foreground italic py-2">No information available</p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        
        {(banknote.banknoteDescription || banknote.historicalDescription) && (
          <div className="mt-6 space-y-4">
            {banknote.banknoteDescription && (
              <Card className="overflow-hidden">
                <CardHeader className="py-3 px-4 bg-muted/30">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Banknote Description
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-sm">
                  {banknote.banknoteDescription}
                </CardContent>
              </Card>
            )}
            
            {banknote.historicalDescription && (
              <Card className="overflow-hidden">
                <CardHeader className="py-3 px-4 bg-muted/30">
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="h-4 w-4" /> Historical Background
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-sm">
                  {banknote.historicalDescription}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BanknoteCatalogDetailMinimized;
