
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { MOCK_COLLECTION_ITEMS } from "@/lib/constants";
import { CollectionItem } from "@/types";
import { BookOpen, Download, HeartHandshake, ListChecks, Plus } from "lucide-react";
import CollectionCard from "@/components/collection/CollectionCard";
import { Link } from "react-router-dom";

const Collection = () => {
  const { user } = useAuth();
  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>(MOCK_COLLECTION_ITEMS);
  const [activeTab, setActiveTab] = useState("collection");

  // Placeholder for wishlist and missing list
  const wishlistItems: CollectionItem[] = [];
  const missingItems: CollectionItem[] = [];

  const handleEditItem = (item: CollectionItem) => {
    console.log("Edit item:", item);
    // In a real app, open edit modal/page
  };

  const handleToggleSale = (item: CollectionItem) => {
    console.log("Toggle sale status for:", item);
    // In a real app, toggle isForSale and update item
    
    // For demo, toggle locally
    setCollectionItems(items => 
      items.map(i => 
        i.id === item.id 
          ? { ...i, isForSale: !i.isForSale } 
          : i
      )
    );
  };

  const getCollectionStats = () => {
    if (!user) return { total: 0, forSale: 0, countries: 0 };
    
    const total = collectionItems.length;
    const forSale = collectionItems.filter(item => item.isForSale).length;
    const uniqueCountries = new Set(collectionItems.map(item => item.banknote.country)).size;
    
    return {
      total,
      forSale,
      countries: uniqueCountries
    };
  };

  const stats = getCollectionStats();

  // Animation observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.1 });

    const hiddenElements = document.querySelectorAll('.reveal');
    hiddenElements.forEach(el => observer.observe(el));
    
    return () => {
      hiddenElements.forEach(el => observer.unobserve(el));
    };
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-500 flex items-center justify-center animate-fade-in">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="mb-6 text-ottoman-400">
            <BookOpen className="h-16 w-16 mx-auto opacity-60" />
          </div>
          <h2 className="text-2xl font-serif font-semibold text-ottoman-200 mb-4">
            Login Required
          </h2>
          <p className="text-ottoman-300 mb-8">
            Please log in to view and manage your collection
          </p>
          <Link to="/auth">
            <Button className="ottoman-button">
              Login to Continue
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-500 animate-fade-in">
      {/* Header */}
      <section className="bg-dark-600 py-12 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute inset-y-0 right-1/2 -z-10 mr-16 w-[200%] origin-bottom-left skew-x-[-30deg] bg-dark-500/40 shadow-xl shadow-ottoman-900/20 ring-1 ring-inset ring-ottoman-900/10"
            aria-hidden="true"
          />
        </div>
        
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-center text-parchment-500 reveal fade-bottom">
            My Collection
          </h1>
          <p className="mt-4 text-center text-ottoman-300 max-w-2xl mx-auto reveal fade-bottom" style={{ animationDelay: '100ms' }}>
            Manage and organize your Ottoman banknote collection
          </p>
        </div>
      </section>
      
      {/* Stats Section */}
      <section className="py-8 bg-dark-600/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 glass-card flex items-center reveal fade-bottom">
              <div className="w-12 h-12 rounded-full bg-ottoman-600/30 flex items-center justify-center mr-4">
                <BookOpen className="h-6 w-6 text-ottoman-300" />
              </div>
              <div>
                <h3 className="text-lg font-serif text-ottoman-200">{stats.total}</h3>
                <p className="text-sm text-ottoman-400">Total Items</p>
              </div>
            </div>
            
            <div className="p-4 glass-card flex items-center reveal fade-bottom" style={{ animationDelay: '100ms' }}>
              <div className="w-12 h-12 rounded-full bg-ottoman-600/30 flex items-center justify-center mr-4">
                <HeartHandshake className="h-6 w-6 text-ottoman-300" />
              </div>
              <div>
                <h3 className="text-lg font-serif text-ottoman-200">{stats.forSale}</h3>
                <p className="text-sm text-ottoman-400">For Sale</p>
              </div>
            </div>
            
            <div className="p-4 glass-card flex items-center reveal fade-bottom" style={{ animationDelay: '200ms' }}>
              <div className="w-12 h-12 rounded-full bg-ottoman-600/30 flex items-center justify-center mr-4">
                <ListChecks className="h-6 w-6 text-ottoman-300" />
              </div>
              <div>
                <h3 className="text-lg font-serif text-ottoman-200">{stats.countries}</h3>
                <p className="text-sm text-ottoman-400">Countries</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Tabs and Content */}
      <section className="py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 reveal fade-bottom">
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="w-full md:w-auto"
            >
              <TabsList className="w-full md:w-auto">
                <TabsTrigger value="collection" className="flex-1 md:flex-initial">
                  Collection
                </TabsTrigger>
                <TabsTrigger value="wishlist" className="flex-1 md:flex-initial">
                  Wishlist
                </TabsTrigger>
                <TabsTrigger value="missing" className="flex-1 md:flex-initial">
                  Missing
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex items-center gap-3 mt-4 md:mt-0 w-full md:w-auto">
              <Button 
                variant="outline" 
                className="border-ottoman-700 text-ottoman-200 w-full md:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              
              <Button 
                className="ottoman-button w-full md:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </div>
          
          {/* Collection Tab */}
          <TabsContent value="collection">
            {collectionItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {collectionItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="reveal fade-bottom"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CollectionCard 
                      item={item} 
                      onEdit={handleEditItem}
                      onToggleSale={handleToggleSale}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <BookOpen className="h-16 w-16 mx-auto text-ottoman-600/30 mb-4" />
                <h3 className="text-2xl font-serif font-semibold text-ottoman-200 mb-2">
                  Your collection is empty
                </h3>
                <p className="text-ottoman-400 mb-6">
                  Start adding items to your collection from the catalog
                </p>
                <Link to="/catalog">
                  <Button className="ottoman-button">
                    Browse Catalog
                  </Button>
                </Link>
              </div>
            )}
          </TabsContent>
          
          {/* Wishlist Tab */}
          <TabsContent value="wishlist">
            {wishlistItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {wishlistItems.map((item) => (
                  <CollectionCard
                    key={item.id}
                    item={item}
                    onEdit={handleEditItem}
                    onToggleSale={handleToggleSale}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <HeartHandshake className="h-16 w-16 mx-auto text-ottoman-600/30 mb-4" />
                <h3 className="text-2xl font-serif font-semibold text-ottoman-200 mb-2">
                  Your wishlist is empty
                </h3>
                <p className="text-ottoman-400 mb-6">
                  Browse the catalog and add items you want to acquire
                </p>
                <Link to="/catalog">
                  <Button className="ottoman-button">
                    Browse Catalog
                  </Button>
                </Link>
              </div>
            )}
          </TabsContent>
          
          {/* Missing Tab */}
          <TabsContent value="missing">
            {missingItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {missingItems.map((item) => (
                  <CollectionCard
                    key={item.id}
                    item={item}
                    onEdit={handleEditItem}
                    onToggleSale={handleToggleSale}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <ListChecks className="h-16 w-16 mx-auto text-ottoman-600/30 mb-4" />
                <h3 className="text-2xl font-serif font-semibold text-ottoman-200 mb-2">
                  Missing list is currently empty
                </h3>
                <p className="text-ottoman-400 mb-6">
                  Your missing list will show items from the catalog that are not in your collection
                </p>
                <Button className="ottoman-button">
                  Generate Missing List
                </Button>
              </div>
            )}
          </TabsContent>
        </div>
      </section>
    </div>
  );
};

export default Collection;
