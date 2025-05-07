import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  getBanknoteById,
  getSimilarBanknotes,
  checkIfBanknoteInCollection
} from "@/services/banknoteService";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailedBanknote } from "@/types";
import { BanknoteImage } from "@/components/banknote/BanknoteImage";
import { useAuth } from "@/context/AuthContext";
import BanknoteCard from "@/components/banknotes/BanknoteCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AddBanknoteToCollectionDialog 
} from "@/components/collection/AddBanknoteToCollectionDialog";
import { 
  BookMarked, 
  Info, 
  Calendar, 
  Printer,
  Tag,
  Search,
  Star as StarIcon,
  GalleryVerticalEnd,
  GalleryThumbnails,
  CircleDollarSign,
  Star
} from "lucide-react";
import { normalizeImageUrls } from "@/utils/imageHelpers";

interface LabelValuePairProps {
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
  iconClassNames?: string;
}

const LabelValuePair: React.FC<LabelValuePairProps> = ({ label, value, icon, iconClassNames }) => {
  if (!value) return null;
  
  return (
    <div className="flex items-start mb-2">
      {icon && (
        <div className={`mt-0.5 mr-2 ${iconClassNames || "text-ottoman-600"}`}>
          {icon}
        </div>
      )}
      <div>
        <span className="text-muted-foreground">{label}: </span>
        <span className="font-medium">{value}</span>
      </div>
    </div>
  );
};

export default function BanknoteCatalogDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAddToCollectionOpen, setIsAddToCollectionOpen] = useState(false);
  
  const { data: banknote, isLoading } = useQuery({
    queryKey: ['banknote', id],
    queryFn: () => getBanknoteById(id as string),
    enabled: !!id,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  const { data: similarBanknotes } = useQuery({
    queryKey: ['similarBanknotes', id],
    queryFn: () => getSimilarBanknotes(id as string),
    enabled: !!id,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  const { data: isInCollection } = useQuery({
    queryKey: ['banknoteInCollection', id, user?.id],
    queryFn: () => checkIfBanknoteInCollection(id as string, user?.id as string),
    enabled: !!id && !!user?.id,
    staleTime: 1000 * 60 // 1 minute
  });

  useEffect(() => {
    if (banknote) {
      const imageUrlsArray = normalizeImageUrls(banknote.imageUrls);
      if (imageUrlsArray && imageUrlsArray.length > 0) {
        setSelectedImage(imageUrlsArray[0]);
      }
    }
  }, [banknote]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
      </div>
    );
  }

  if (!banknote) {
    return (
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold mb-4">Banknote not found</h1>
        <p className="mb-4">The banknote you are looking for does not exist.</p>
        <Button asChild>
          <Link to="/catalog">Back to Catalog</Link>
        </Button>
      </div>
    );
  }

  const handleSelectImage = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  // Fix the imageUrls handling to ensure it's always an array
  const imageUrls = normalizeImageUrls(banknote.imageUrls);

  const detailGroups = [
    {
      title: "Details",
      items: [
        { label: "Country", value: banknote.country, icon: <Info className="h-4 w-4" /> },
        { label: "Denomination", value: banknote.denomination, icon: <CircleDollarSign className="h-4 w-4" /> },
        { label: "Year", value: banknote.year, icon: <Calendar className="h-4 w-4" /> },
        { label: "Series", value: banknote.series, icon: <Printer className="h-4 w-4" /> },
        { label: "Category", value: banknote.category, icon: <Tag className="h-4 w-4" /> },
        { label: "Sultan", value: banknote.sultanName, icon: <Star className="h-4 w-4" /> },
        { label: "Catalog Number", value: banknote.extendedPickNumber, icon: <Search className="h-4 w-4" /> },
      ],
    },
    {
      title: "Descriptions",
      items: [
        { label: "Obverse", value: banknote.obverseDescription, icon: <GalleryVerticalEnd className="h-4 w-4" /> },
        { label: "Reverse", value: banknote.reverseDescription, icon: <GalleryThumbnails className="h-4 w-4" /> },
      ],
    },
  ];

  const showingPanels = detailGroups.filter((group) =>
    group.items.some((item) => item.value)
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Main image and thumbnail section */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="aspect-video bg-white rounded-lg overflow-hidden flex items-center justify-center border">
                {selectedImage ? (
                  <BanknoteImage
                    imageUrl={selectedImage}
                    alt={`${banknote.denomination} ${banknote.year}`}
                    className="max-h-full object-contain"
                  />
                ) : (
                  <div className="text-muted-foreground">No image available</div>
                )}
              </div>
              
              <ScrollArea className="w-full whitespace-nowrap h-20">
                <div className="flex space-x-2">
                  {imageUrls.map((url, idx) => (
                    <div 
                      key={`thumb-${idx}`}
                      className={`h-16 w-24 rounded-md cursor-pointer border-2 overflow-hidden flex-shrink-0
                        ${selectedImage === url ? 'border-ottoman-600' : 'border-transparent'}`}
                      onClick={() => handleSelectImage(url)}
                    >
                      <BanknoteImage
                        imageUrl={url}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Banknote details */}
          <Card>
            <CardHeader>
              <CardTitle>{banknote.denomination} ({banknote.year})</CardTitle>
              <CardDescription>
                {banknote.country} - {banknote.series}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="details" className="w-full">
                <TabsList>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="description">Description</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="space-y-2">
                  {showingPanels.map((group) => (
                    <div key={group.title} className="mb-4">
                      <h3 className="text-lg font-semibold mb-2">{group.title}</h3>
                      {group.items.map(
                        (
                          item,
                          index
                        ) =>
                          item.value ? (
                            <LabelValuePair
                              key={`${group.title}-${index}`}
                              label={item.label}
                              value={item.value}
                              icon={item.icon}
                            />
                          ) : null
                      )}
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="description">
                  <div className="space-y-2">
                    {banknote.description && (
                      <div>
                        <h4 className="text-sm font-bold">General Description</h4>
                        <p className="text-muted-foreground">{banknote.description}</p>
                      </div>
                    )}
                    {banknote.obverseDescription && (
                      <div>
                        <h4 className="text-sm font-bold">Obverse Description</h4>
                        <p className="text-muted-foreground">{banknote.obverseDescription}</p>
                      </div>
                    )}
                    {banknote.reverseDescription && (
                      <div>
                        <h4 className="text-sm font-bold">Reverse Description</h4>
                        <p className="text-muted-foreground">{banknote.reverseDescription}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          {/* Action buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>What do you want to do?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {user ? (
                <>
                  <Button 
                    className="w-full"
                    onClick={() => setIsAddToCollectionOpen(true)}
                    disabled={isInCollection !== undefined && isInCollection !== null}
                  >
                    {isInCollection !== undefined && isInCollection !== null ? (
                      <>
                        <BookMarked className="mr-2 h-4 w-4" />
                        In Collection
                      </>
                    ) : (
                      <>
                        <StarIcon className="mr-2 h-4 w-4" />
                        Add to Collection
                      </>
                    )}
                  </Button>
                  <Separator />
                  <Button asChild variant="link" className="w-full justify-start">
                    <Link to={`/search?q=${banknote.denomination} ${banknote.year}`}>
                      <Search className="mr-2 h-4 w-4" />
                      Search Online
                    </Link>
                  </Button>
                </>
              ) : (
                <p className="text-muted-foreground">
                  <Link to="/login" className="text-blue-500">Log in</Link> to add this banknote to your collection.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Related Banknotes (Similar Banknotes) */}
        </div>
      </div>

      {/* Add to collection dialog */}
      <AddBanknoteToCollectionDialog 
        isOpen={isAddToCollectionOpen}
        onClose={() => setIsAddToCollectionOpen(false)}
        banknoteId={banknote.id}
      />

      {/* Similar Banknotes Section */}
      {similarBanknotes && similarBanknotes.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-4">Similar Banknotes</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {similarBanknotes.slice(0, 8).map((similar: DetailedBanknote) => (
              <BanknoteCard 
                key={similar.id} 
                banknote={similar} 
                source="catalog" 
                linkTo={`/banknote-details/${similar.id}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
