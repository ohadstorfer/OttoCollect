import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchBanknoteDetail } from '@/services/banknoteService';
import { DetailedBanknote } from '@/types';
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, AlertTriangle, Edit, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from '@/context/AuthContext';
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function BanknoteDetail() {
  const { id } = useParams<{ id: string }>();
  const [banknote, setBanknote] = useState<DetailedBanknote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showDescription, setShowDescription] = useState(false);
  const [showHistoricalDescription, setShowHistoricalDescription] = useState(false);
  const [showSerialNumbering, setShowSerialNumbering] = useState(false);
  const [showSecurityElement, setShowSecurityElement] = useState(false);
  const [showSignaturesFront, setShowSignaturesFront] = useState(false);
  const [showSignaturesBack, setShowSignaturesBack] = useState(false);
  const [showColors, setShowColors] = useState(false);

  useEffect(() => {
    if (!id) {
      console.error('No banknote ID provided.');
      setIsError(true);
      setIsLoading(false);
      return;
    }

    const fetchBanknote = async () => {
      setIsLoading(true);
      setIsError(false);
      try {
        const banknoteData = await fetchBanknoteDetail(id);
        if (banknoteData) {
          setBanknote(banknoteData);
        } else {
          setIsError(true);
        }
      } catch (error) {
        console.error('Failed to fetch banknote:', error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBanknote();
  }, [id]);

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    toast({
      title: "Copied!",
      description: "Successfully copied to clipboard.",
    })
    setTimeout(() => setIsCopied(false), 3000);
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <h1 className="page-title">
          <Skeleton className="h-8 w-48" />
        </h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="ottoman-card p-4">
              <Skeleton className="h-40 w-full mb-2" />
              <Skeleton className="h-6 w-32 mb-1" />
              <Skeleton className="h-4 w-48 mb-1" />
              <Skeleton className="h-4 w-48 mb-1" />
              <Skeleton className="h-4 w-48" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !banknote) {
    return (
      <div className="page-container">
        <h1 className="page-title">Banknote Detail</h1>
        <div className="ottoman-card p-6 text-center">
          <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-medium">Failed to load banknote detail.</p>
          <p className="text-muted-foreground">
            There was an error fetching the banknote. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">Banknote Detail</h1>

      <div className="md:flex md:space-x-6">
        {/* Image Gallery */}
        <div className="md:w-1/2">
          <div className="ottoman-card p-4 mb-4">
            <ScrollArea className="h-[450px] w-full rounded-md border">
              <div className="flex flex-col gap-4">
                {banknote.imageUrls.map((url, index) => (
                  <div key={index} className="relative">
                    <AspectRatio ratio={4 / 3}>
                      <img
                        src={url}
                        alt={`${banknote.country} Banknote - Image ${index + 1}`}
                        className="object-cover rounded-md"
                      />
                    </AspectRatio>
                    <p className="absolute bottom-2 left-2 text-sm text-white bg-black bg-opacity-50 rounded px-2 py-1">
                      Image {index + 1}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Banknote Details */}
        <div className="md:w-1/2">
          <div className="ottoman-card p-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-semibold">{banknote.extendedPickNumber}</h2>
                <p className="text-muted-foreground">
                  {banknote.country} - {banknote.denomination} - {banknote.year}
                </p>
              </div>
              {user?.role === 'admin' && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/banknote/edit/${banknote.id}`)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Edit Banknote</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            <Separator className="mb-4" />

            <div className="space-y-3">
              <div>
                <Label>Catalog ID</Label>
                <div className="flex items-center">
                  <Input
                    className="cursor-not-allowed"
                    type="text"
                    value={banknote.catalogId || 'N/A'}
                    readOnly
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyToClipboard(banknote.catalogId)}
                          disabled={isCopied}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Copy to clipboard</p>
                      </TooltipContent>
                    </TooltipProvider>
                  </TooltipProvider>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Button variant="link" onClick={() => setShowDescription(!showDescription)}>
                  {showDescription ? "Hide Description" : "Show Description"}
                </Button>
                {showDescription && (
                  <Textarea
                    className="mt-2 h-24 cursor-not-allowed"
                    value={banknote.description || 'No description available.'}
                    readOnly
                  />
                )}
              </div>

              <div>
                <Label>Historical Description</Label>
                <Button variant="link" onClick={() => setShowHistoricalDescription(!showHistoricalDescription)}>
                  {showHistoricalDescription ? "Hide Historical Description" : "Show Historical Description"}
                </Button>
                {showHistoricalDescription && (
                  <Textarea
                    className="mt-2 h-24 cursor-not-allowed"
                    value={banknote.historicalDescription || 'No historical description available.'}
                    readOnly
                  />
                )}
              </div>

              <div>
                <Label>Serial Numbering</Label>
                <Button variant="link" onClick={() => setShowSerialNumbering(!showSerialNumbering)}>
                  {showSerialNumbering ? "Hide Serial Numbering" : "Show Serial Numbering"}
                </Button>
                {showSerialNumbering && (
                  <Textarea
                    className="mt-2 h-24 cursor-not-allowed"
                    value={banknote.serialNumbering || 'No serial numbering information available.'}
                    readOnly
                  />
                )}
              </div>

              <div>
                <Label>Security Element</Label>
                <Button variant="link" onClick={() => setShowSecurityElement(!showSecurityElement)}>
                  {showSecurityElement ? "Hide Security Element" : "Show Security Element"}
                </Button>
                {showSecurityElement && (
                  <Textarea
                    className="mt-2 h-24 cursor-not-allowed"
                    value={banknote.securityElement || 'No security element information available.'}
                    readOnly
                  />
                )}
              </div>

              <div>
                <Label>Signatures Front</Label>
                <Button variant="link" onClick={() => setShowSignaturesFront(!showSignaturesFront)}>
                  {showSignaturesFront ? "Hide Signatures Front" : "Show Signatures Front"}
                </Button>
                {showSignaturesFront && (
                  <Textarea
                    className="mt-2 h-24 cursor-not-allowed"
                    value={banknote.signaturesFront || 'No information about signatures on the front.'}
                    readOnly
                  />
                )}
              </div>

              <div>
                <Label>Signatures Back</Label>
                <Button variant="link" onClick={() => setShowSignaturesBack(!showSignaturesBack)}>
                  {showSignaturesBack ? "Hide Signatures Back" : "Show Signatures Back"}
                </Button>
                {showSignaturesBack && (
                  <Textarea
                    className="mt-2 h-24 cursor-not-allowed"
                    value={banknote.signaturesBack || 'No information about signatures on the back.'}
                    readOnly
                  />
                )}
              </div>

              <div>
                <Label>Colors</Label>
                <Button variant="link" onClick={() => setShowColors(!showColors)}>
                  {showColors ? "Hide Colors" : "Show Colors"}
                </Button>
                {showColors && (
                  <Textarea
                    className="mt-2 h-24 cursor-not-allowed"
                    value={banknote.colors || 'No color information available.'}
                    readOnly
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <meta property="og:image" content={Array.isArray(banknote.front_picture) ? banknote.front_picture[0] : banknote.front_picture} />
    </div>
  );
}
