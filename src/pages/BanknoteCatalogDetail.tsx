import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchBanknoteDetail } from "@/services/banknoteService";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import {
  Calendar,
  BookOpen,
  Users,
  PenTool,
  Stamp,
  Hash,
  Shield,
  ArrowLeft,
  Info,
  ImagePlus,
  FileText,
  Map,
  History,
  Building,
  CircleDollarSign,
  Star,
  Plus,
  Check,
  BookmarkPlus,
  Image,
  HeartPulse,
  HeartIcon,
  LogIn
} from "lucide-react";
import { userHasBanknoteInCollection } from "@/utils/userBanknoteHelpers";
import { fetchUserCollection } from "@/services/collectionService";
import { addToWishlist, fetchWishlistItem } from "@/services/wishlistService";
// Removed invalid imports from wishlistService
import { useToast } from "@/hooks/use-toast";
import { BanknoteCatalogDetailMinimized } from "@/components/BanknoteCatalogDetailMinimized";

interface LabelValuePairProps {
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
  iconClassNames?: string;
}

interface BanknoteCatalogDetailProps {
  id?: string; // Make id optional so it can be provided as a prop
}

const LabelValuePair: React.FC<LabelValuePairProps> = ({ label, value, icon, iconClassNames }) => {
  if (!value) return null;

  return (
    <div className="grid grid-cols-[130px_1fr] gap-x-2 gap-y-1.5 py-1.5 border-b border-gray-100 last:border-0">
      <div className="text-right font-medium text-muted-foreground">{label}</div>
      <div className="flex items-center space-x-2">
        {icon && <div className={`text-primary ${iconClassNames}`}>{icon}</div>}
        <span>{value}</span>
      </div>
    </div>
  );
};

export default function BanknoteCatalogDetail({ id: propsId }: BanknoteCatalogDetailProps = {}) {
  const { id: paramsId } = useParams<{ id: string }>();
  const id = propsId || paramsId; // Use the prop id if provided, otherwise use the URL param

  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // State for ownership toast for Check button
  const [showOwnershipToast, setShowOwnershipToast] = useState(false);

  // Add: State to force re-evaluate after adding another copy
  const [ownershipIncrement, setOwnershipIncrement] = useState(0);

  // Track "just added" status to help with instant UI feedback and flicker prevention
  const [hasJustBeenAdded, setHasJustBeenAdded] = useState(false);

  // Styling class for Check button
  const checkButtonClass =
    "h-8 w-8 shrink-0 rounded-full border border-green-900 bg-gradient-to-br from-green-900 via-green-800 to-green-950 text-green-200 hover:bg-green-900 hover:shadow-lg transition-all duration-200 shadow-lg";

  // Add: State to force immediate UI update after wishlisting
  const [hasJustBeenWishlisted, setHasJustBeenWishlisted] = useState(false);

  // Handler for pressing the Check button (shows custom toast/dialog)
  const handleOwnershipCheckButton = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShowOwnershipToast(true);
  };

  // YES and Cancel handlers for ownership toast
  const handleOwnershipToastYes = async (e: React.MouseEvent) => {
    setShowOwnershipToast(false);
    await handleAddToCollection();
    // Increment ownership key to re-query and re-render after adding
    setOwnershipIncrement((k) => k + 1);
    setHasJustBeenAdded(true);
    // Show the notification toast as requested
    toast({
      title: "Added to your collection!",
      description: "This banknote was added. Visit your collection to edit its details.",
      className: "justify-center items-center w-full",
      duration: 3000,
    });
  };
  const handleOwnershipToastCancel = () => setShowOwnershipToast(false);

  // Custom renderOwnershipToast (identical to BanknoteDetailCard.tsx)
  const renderOwnershipToast = () => {
    if (!showOwnershipToast) return null;
    return (
      <div
        className="fixed top-8 left-1/2 z-[200] flex flex-col items-center fade-in-center-top"
        style={{
          transform: "translate(-50%, 0)",
          minWidth: 330,
          maxWidth: "95vw",
          width: 380,
        }}
      >
        <div className="bg-background border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-6 py-4 flex flex-col items-center">
          <div className="font-semibold text-center text-base mb-1">Already in your collection</div>
          <div className="text-muted-foreground text-center text-sm mb-3">
            You already have a copy of this banknote in your collection.<br />
            Do you want to add <strong>another copy</strong> of it?
          </div>
          <div className="flex gap-4 justify-center w-full mt-2">
            <button
              type="button"
              className="bg-green-700 hover:bg-green-800 text-white font-medium py-2 px-6 rounded transition-colors focus:outline-none shadow"
              onClick={handleOwnershipToastYes}
              autoFocus
            >
              Yes
            </button>
            <button
              type="button"
              className="bg-muted text-muted-foreground border border-gray-300 hover:bg-gray-200 rounded py-2 px-6 font-medium transition-colors focus:outline-none"
              onClick={handleOwnershipToastCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Query client for refreshing on add to collection
  const queryClient = useQueryClient();

  // Fetch the banknote details
  const { data: banknote, isLoading: banknoteLoading, isError: banknoteError } = useQuery({
    queryKey: ["banknoteDetail", id],
    queryFn: () => fetchBanknoteDetail(id || ""),
    enabled: !!id,
  });

  // Fetch user collection, if logged in, and re-fetch after ownershipIncrement
  const { data: userCollection = [], isLoading: collectionLoading } = useQuery({
    queryKey: ["userCollection", user?.id, ownershipIncrement], // depend on increment for refetch
    queryFn: () => user?.id ? fetchUserCollection(user.id) : Promise.resolve([]),
    enabled: !!user?.id,
  });

  // === Wishlist Check: Fast existence lookup ===
  const { data: wishlistItem, isLoading: wishlistLoading } = useQuery({
    queryKey: ["wishlistStatus", user?.id, banknote?.id],
    enabled: !!user?.id && !!banknote?.id,
    queryFn: () =>
      user && banknote
        ? fetchWishlistItem(user.id, banknote.id)
        : Promise.resolve(null),
    staleTime: 1000 * 60 * 10, // cache for 10min
  });

  // --- Button Visibility and Ownership ---
  // Only calculate ownsThisBanknote if not loading collection and have userCollection array
  // (add hasJustBeenAdded for immediate UI feedback after add)
  const ownsThisBanknote =
    user && banknote && Array.isArray(userCollection) && !collectionLoading
      ? userHasBanknoteInCollection(banknote, userCollection)
      : false;
  const shouldShowCheckButton = (ownsThisBanknote || hasJustBeenAdded);

  // Functionality for add to collection; triggers refetch for the buttons
  const [adding, setAdding] = useState(false);
  // refactored handleAddToCollection to NOT show the toast here, but only after confirmed add from toast or Add button
  const handleAddToCollection = async () => {
    if (!banknote || !user) return;
    try {
      setAdding(true);
      const { addToCollection } = await import("@/services/collectionService");
      await addToCollection({
        userId: user.id,
        banknoteId: banknote.id
      });
      // Notification toast now shown in handleOwnershipToastYes and Add button only, to avoid double firing
      queryClient.invalidateQueries({ queryKey: ["userCollection", user.id] });
    } catch (err) {
      toast({
        title: "Error",
        description: "Could not add to collection.",
        variant: "destructive"
      });
    } finally {
      setAdding(false);
    }
  };

  // Insert here: handleAddToWishList function
  const { toast } = useToast();
  const handleAddToWishList = async () => {
    if (!user || !user.id || !banknote?.id) return;
    try {
      const result = await addToWishlist(user.id, banknote.id);
      if (result) {
        setHasJustBeenWishlisted(true); // User feedback: instantly hide button
        toast({
          title: "Added to wish list!",
          description: "This banknote was added to your wish list.",
          className: "justify-center items-center w-full",
          duration: 3000,
        });
      } else {
        toast({
          title: "Already in wish list",
          description: "This banknote is already in your wish list.",
          className: "justify-center items-center w-full",
          duration: 3000,
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to add banknote to wish list.",
        variant: "destructive",
        duration: 3500,
      });
    }
  };

  if (banknoteLoading) {
    return (
      <div className="page-container max-w-5xl mx-auto py-10">
        <div className="flex justify-center py-12">
          <div className="animate-pulse flex flex-col items-center">
            <div className="rounded-full bg-gray-200 h-16 w-16 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-40 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      </div>
    );
  }

  if (banknoteError || !banknote) {
    return (
      <div className="page-container max-w-5xl mx-auto py-10">
        <div className="ottoman-card p-8 text-center">
          <h2 className="text-2xl font-serif mb-4">Error Loading Banknote</h2>
          <p className="mb-6 text-muted-foreground">
            We couldn't load the banknote details. Please try again later.
          </p>
          {!propsId && ( // Only show the back button when not in dialog mode
            <Button onClick={() => navigate(-1)}>Go Back</Button>
          )}
        </div>
      </div>
    );
  }

  if (user?.role !== 'Super Admin' && user?.role !== 'Admin' && banknote?.isPending) {
    return (
      <div className="page-container max-w-5xl mx-auto py-10">
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


  if (!user) {
    return (
      <div className="page-container">
        <h1 className="page-title">Banknote Details</h1>

        <div className="max-w-2xl mx-auto text-center">
          <div className="ottoman-card p-8 flex flex-col items-center">
            <h2 className="text-2xl font-serif mb-4">Join the Community</h2>
            <p className="mb-6 text-muted-foreground">
              Please sign in to view the details of this banknote.
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


  const openImageViewer = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  // Replace imageUrls array with watermarked images
  const imageUrls = [
    banknote?.frontPictureWatermarked || banknote?.frontPicture,
    banknote?.backPictureWatermarked || banknote?.backPicture
  ].filter(Boolean);

  const detailGroups = [
    {
      title: "Basic Information",
      icon: <Info className="h-5 w-5" />,
      fields: [
        { label: "Denomination", value: banknote?.denomination, icon: <CircleDollarSign className="h-4 w-4" /> },
        { label: "Country", value: banknote?.country, icon: <Map className="h-4 w-4" /> },
        { label: "Islamic Year", value: banknote?.islamicYear, icon: <Calendar className="h-4 w-4" /> },
        { label: "Gregorian Year", value: banknote?.gregorianYear, icon: <Calendar className="h-4 w-4" /> },
        { label: "Category", value: banknote?.category, icon: <Hash className="h-4 w-4" /> },
        { label: "Type", value: banknote?.type, icon: <FileText className="h-4 w-4" /> },
        { label: "Sultan", value: banknote?.sultanName, icon: <Users className="h-4 w-4" /> },
        { label: "Pick Number", value: banknote?.pickNumber, icon: <Hash className="h-4 w-4" /> },
        { label: "Extended Pick", value: banknote?.extendedPickNumber, icon: <Hash className="h-4 w-4" /> },
        { label: "Turkish Cat #", value: banknote?.turkCatalogNumber, icon: <Hash className="h-4 w-4" /> },
        { label: "Rarity", value: banknote?.rarity, icon: <Star className="h-4 w-4" /> }
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
    <div className="page-container  mx-auto ">
      {renderOwnershipToast()}
      <div className="flex flex-col ">
        <div className="space-y-1 page-container max-w-5xl mx-auto">
          <div className="flex items-baseline  gap-4">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              {banknote.denomination}
            </h1>
            {banknote.extendedPickNumber && (
              <p className="text-xl leading-tight">
                {banknote.extendedPickNumber}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xl text-muted-foreground">{banknote.country}, {banknote.year}</p>
            {!propsId && (
              <div className="flex items-center space-x-2">

                <Button variant="ghost" onClick={() => navigate(-1)}>
                  Back
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Image className="h-5 w-5 mr-2" />
                  Banknote Images
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 pt-2 pb-2">
                <div className="flex flex-col space-y-3">
                  {imageUrls.length > 0 ? (
                    imageUrls.slice(0, 4).map((url, index) => (
                      <div
                        key={index}
                        className="w-full cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => openImageViewer(url)}
                      >
                        <div className="w-full rounded-md overflow-hidden border">
                          <img
                            src={url}
                            alt={`Banknote Image ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 p-6 text-center bg-muted rounded-md">
                      <p className="text-muted-foreground">No images available</p>
                    </div>
                  )}

                  {imageUrls.length > 4 && (
                    <Sheet>
                      <SheetTrigger asChild>
                        <div className="relative aspect-[3/2] cursor-pointer bg-muted rounded-md flex items-center justify-center hover:bg-muted/80 transition-colors">
                          <span className="text-lg font-medium">+{imageUrls.length - 4} more</span>
                        </div>
                      </SheetTrigger>
                      <SheetContent className="w-[90%] sm:max-w-lg">
                        <SheetHeader>
                          <SheetTitle>All Banknote Images</SheetTitle>
                          <SheetDescription>
                            {banknote.country}, {banknote.denomination}, {banknote.year}
                          </SheetDescription>
                        </SheetHeader>
                        <div className="grid grid-cols-2 gap-4 mt-8">
                          {imageUrls.map((url, index) => (
                            <div
                              key={index}
                              className="relative aspect-[3/2] cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => openImageViewer(url)}
                            >
                              <div className="absolute inset-0 rounded-md overflow-hidden border">
                                <img
                                  src={url}
                                  alt={`Banknote Image ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </SheetContent>
                    </Sheet>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="border-t-4 border-t-primary shadow-md">
              <CardHeader className="border-b bg-muted/20">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl m-0">
                    Banknote Details
                  </CardTitle>
                </div>
                <CardDescription>
                  Detailed information about this banknote
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <BanknoteCatalogDetailMinimized 
                  banknote={banknote} 
                  onImageClick={openImageViewer} 
                />
              </CardContent>
            </Card>

            {selectedImage && (
              <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
                <DialogContent className="sm:max-w-[800px] p-1">
                  <img
                    src={selectedImage}
                    alt="Banknote detail"
                    className="w-full h-auto rounded"
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
