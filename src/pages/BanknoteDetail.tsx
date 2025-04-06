import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { fetchBanknoteDetail } from "@/services/banknoteService";
import { useAuth } from "@/context/AuthContext";
import { BanknoteDetailSource, DetailedBanknote } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

import { Calendar, BookOpen, Users, PenTool, Stamp, Hash, Shield } from "lucide-react";

// Define a functional component called LabelValuePair
interface LabelValuePairProps {
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
  iconClassNames?: string;
}

const LabelValuePair: React.FC<LabelValuePairProps> = ({ label, value, icon, iconClassNames }) => {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-x-2 gap-y-1.5">
      <Label className="text-right">{label}</Label>
      <div className="flex items-center space-x-2">
        {icon && <div className={iconClassNames}>{icon}</div>}
        <span className="text-gray-800">{value || "N/A"}</span>
      </div>
    </div>
  );
};

export default function BanknoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // State to manage the open/close state of the dialog
  const [open, setOpen] = React.useState(false);

  // State to hold the note text
  const [note, setNote] = React.useState("");

  // Fetch banknote detail using react-query
  const { data: detailedBanknote, isLoading, isError } = useQuery({
    queryKey: ["banknoteDetail", id],
    queryFn: () => fetchBanknoteDetail(id || ""),
    enabled: !!id, // Only run the query if `id` is not null
  });

  // Mock properties for testing purposes
  const banknote = {
    id: "1",
    catalogId: "C123",
    country: "Ottoman Empire",
    denomination: "50 Kurush",
    year: "1916",
    series: "Series 1",
    description: "A beautiful banknote from the Ottoman Empire.",
    obverseDescription: "Features Sultan Mehmed V.",
    reverseDescription: "Depicts the Ottoman coat of arms.",
    imageUrls: [
      "/images/ottoman-empire.jpg",
      "/images/palestine-mandate.jpg",
    ],
    isApproved: true,
    isPending: false,
    createdAt: "2023-01-01T00:00:00.000Z",
    updatedAt: "2023-01-01T00:00:00.000Z",
    createdBy: "admin",
  };

  const collectionItem = {
    id: "1",
    userId: "1",
    banknoteId: "1",
    banknote: banknote,
    condition: "UNC",
    salePrice: 100,
    isForSale: true,
    publicNote: "Mint condition",
    privateNote: "Stored in a safe",
    purchasePrice: 50,
    purchaseDate: "2023-01-01T00:00:00.000Z",
    location: "Safe",
    obverseImage: "/images/ottoman-empire.jpg",
    reverseImage: "/images/palestine-mandate.jpg",
    orderIndex: 1,
    createdAt: "2023-01-01T00:00:00.000Z",
    updatedAt: "2023-01-01T00:00:00.000Z",
    personalImages: [
      "/images/ottoman-empire.jpg",
      "/images/palestine-mandate.jpg",
    ],
  };

  const isInCollection = true;
  const source: BanknoteDetailSource = "catalog";

  if (isLoading) {
    return <div className="text-center">Loading banknote details...</div>;
  }

  if (isError) {
    return <div className="text-center">Error loading banknote details.</div>;
  }

  // Update the role comparison check
  if (user?.role !== 'Super Admin' && user?.role !== 'Admin' && !isInCollection && banknote?.isPending) {
    return (
      <div className="page-container">
        <h1 className="page-title">Banknote Details</h1>
        <div className="max-w-2xl mx-auto text-center">
          <div className="ottoman-card p-8 flex flex-col items-center">
            <h2 className="text-2xl font-serif mb-4">Pending Approval</h2>
            <p className="mb-6 text-muted-foreground">
              This banknote is pending administrator approval.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Fix property name mismatches (snake_case to camelCase)
  // Update all the property references from snake_case to camelCase
  // For example:
  // Replace sultan_name with sultanName
  // Replace pick_number with pickNumber
  // Replace turk_catalog_number with turkCatalogNumber
  // Replace islamic_year with islamicYear
  // Replace gregorian_year with gregorianYear
  // Replace signatures_front with signaturesFront
  // Replace signatures_back with signaturesBack
  // Replace seal_names with sealNames
  // Replace serial_numbering with serialNumbering
  // Replace security_element with securityElement

  // For the Data section rendering, fix the property names:
  // Find the occurrences of detailedBanknote.sultan_name and replace with detailedBanknote.sultanName
  
  return (
    <div className="page-container">
      <h1 className="page-title">Banknote Details</h1>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Image Gallery Section */}
        <div className="md:w-1/2">
          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
              <CardDescription>
                View high-resolution images of the banknote.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] w-full rounded-md border">
                <div className="flex flex-col gap-4 p-4">
                  {banknote.imageUrls.map((url, index) => (
                    <div key={index} className="relative aspect-square">
                      <AspectRatio ratio={1 / 1}>
                        <img
                          src={url}
                          alt={`Banknote Image ${index + 1}`}
                          className="rounded-md object-cover"
                        />
                      </AspectRatio>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Basic Information Section */}
        <div className="md:w-1/2">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Details about the banknote's origin and issuance.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <LabelValuePair label="Country" value={banknote.country} />
              <LabelValuePair label="Denomination" value={banknote.denomination} />
              <LabelValuePair label="Year" value={banknote.year} />
              <LabelValuePair label="Series" value={banknote.series} />
              <LabelValuePair label="Catalog ID" value={banknote.catalogId} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator className="my-6" />

      <div className="flex flex-col md:flex-row gap-4">
        {/* Detailed Information Section */}
        <div className="md:w-1/2">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Information</CardTitle>
              <CardDescription>
                Additional details about the banknote.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <LabelValuePair 
                label="Sultan Name" 
                value={detailedBanknote.sultanName} 
                icon={<Users className="h-4 w-4 text-muted-foreground" />} 
                iconClassNames={detailedBanknote.sultanName ? "" : "opacity-50"}
              />
              <LabelValuePair 
                label="Pick Number" 
                value={detailedBanknote.pickNumber} 
                icon={<BookOpen className="h-4 w-4 text-muted-foreground" />}
                iconClassNames={detailedBanknote.pickNumber ? "" : "opacity-50"}
              />
              
              <LabelValuePair 
                label="Turkish Catalog No." 
                value={detailedBanknote.turkCatalogNumber} 
                icon={<BookOpen className="h-4 w-4 text-muted-foreground" />}
                iconClassNames={detailedBanknote.turkCatalogNumber ? "" : "opacity-50"}
              />
              
              <LabelValuePair 
                label="Islamic Year" 
                value={detailedBanknote.islamicYear} 
                icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
                iconClassNames={detailedBanknote.islamicYear ? "" : "opacity-50"}
              />
              
              <LabelValuePair 
                label="Gregorian Year" 
                value={detailedBanknote.gregorianYear} 
                icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
                iconClassNames={detailedBanknote.gregorianYear ? "" : "opacity-50"}
              />
              
              <LabelValuePair 
                label="Front Signatures" 
                value={detailedBanknote.signaturesFront} 
                icon={<PenTool className="h-4 w-4 text-muted-foreground" />}
                iconClassNames={detailedBanknote.signaturesFront ? "" : "opacity-50"}
              />
              
              <LabelValuePair 
                label="Back Signatures" 
                value={detailedBanknote.signaturesBack} 
                icon={<PenTool className="h-4 w-4 text-muted-foreground" />}
                iconClassNames={detailedBanknote.signaturesBack ? "" : "opacity-50"}
              />
              
              <LabelValuePair 
                label="Seal Names" 
                value={detailedBanknote.sealNames} 
                icon={<Stamp className="h-4 w-4 text-muted-foreground" />}
                iconClassNames={detailedBanknote.sealNames ? "" : "opacity-50"}
              />
              
              <LabelValuePair 
                label="Serial Numbering" 
                value={detailedBanknote.serialNumbering} 
                icon={<Hash className="h-4 w-4 text-muted-foreground" />}
                iconClassNames={detailedBanknote.serialNumbering ? "" : "opacity-50"}
              />
              
              <LabelValuePair 
                label="Security Elements" 
                value={detailedBanknote.securityElement} 
                icon={<Shield className="h-4 w-4 text-muted-foreground" />}
                iconClassNames={detailedBanknote.securityElement ? "" : "opacity-50"}
              />
            </CardContent>
          </Card>
        </div>

        {/* Description Section */}
        <div className="md:w-1/2">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
              <CardDescription>
                Additional details and notes about the banknote.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <p>{banknote.description}</p>
              <p>Obverse: {banknote.obverseDescription}</p>
              <p>Reverse: {banknote.reverseDescription}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>

        {isInCollection ? (
          <Button variant="secondary">View in Collection</Button>
        ) : (
          <Button>Add to Collection</Button>
        )}
      </div>

      {/* Dialog Component */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">Add Note</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add a Note</DialogTitle>
            <DialogDescription>
              Write any additional information about this banknote.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Type your note here."
            />
          </div>
          <DialogFooter>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
