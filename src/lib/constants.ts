
import { BanknoteCondition, UserRank, Banknote, MarketplaceItem } from "@/types";

// Update the RANK_POINTS object to use the correct UserRank values
export const RANK_POINTS: Record<UserRank, number> = {
  'Newbie': 0,
  'Beginner Collector': 50,
  'Casual Collector': 200,
  'Known Collector': 500,
  'Advance Collector': 1000,
  'Admin': 0,
  'Super Admin': 0
};

// Update the CONDITION_DESCRIPTIONS to use the correct BanknoteCondition values
export const CONDITION_DESCRIPTIONS: Record<BanknoteCondition, string> = {
  'UNC': 'Uncirculated - Brand new condition with no signs of handling, wear, or deterioration.',
  'AU': 'About Uncirculated - Very light handling with some slight imperfections.',
  'XF': 'Extremely Fine - Light circulation with minor creases or folds.',
  'VF': 'Very Fine - Some circulation with creases, folds, and minor soiling.',
  'F': 'Fine - Significant circulation with multiple creases and folds.',
  'VG': 'Very Good - Heavy circulation with multiple heavy creases and some minor damage.',
  'G': 'Good - Heavily used with considerable wear and potentially some minor damage.'
};

// Mock data for development
export const MOCK_BANKNOTES: Banknote[] = [
  {
    id: "1",
    pick_number: "123",
    catalogId: "C123",
    country: "Ottoman Empire",
    denomination: "50 Kurush",
    year: "1916",
    series: "Series 1",
    description: "A beautiful banknote from the Ottoman Empire.",
    obverseDescription: "Features Sultan Mehmed V.",
    reverseDescription: "Depicts the Ottoman coat of arms.",
    imageUrls: ["/images/ottoman-empire.jpg", "/images/placeholder-brown.svg"],
    isApproved: true,
    isPending: false,
    createdAt: "2023-01-01T00:00:00.000Z",
    updatedAt: "2023-01-01T00:00:00.000Z",
    createdBy: "admin",
    turkCatalogNumber: "TK123",
    sealNames: "Mehmed V",
    sultanName: "Mehmed V",
    type: "Regular Issue"
  },
  {
    id: "2",
    pick_number: "124",
    catalogId: "C124",
    country: "Ottoman Empire",
    denomination: "100 Kurush",
    year: "1917",
    series: "Series 1",
    description: "A rare banknote from the Ottoman Empire.",
    imageUrls: ["/placeholder-brown.svg"],
    isApproved: true,
    isPending: false,
    createdAt: "2023-02-01T00:00:00.000Z",
    updatedAt: "2023-02-01T00:00:00.000Z",
    createdBy: "admin",
    turkCatalogNumber: "TK124",
    sealNames: "Mehmed V",
    sultanName: "Mehmed V"
  },
  {
    id: "3",
    pick_number: "125",
    catalogId: "C125",
    country: "Palestine Mandate",
    denomination: "1 Pound",
    year: "1939",
    series: "Series A",
    description: "A Palestine Mandate period banknote.",
    imageUrls: ["/images/palestine-mandate.jpg"],
    isApproved: true,
    isPending: false,
    createdAt: "2023-03-01T00:00:00.000Z",
    updatedAt: "2023-03-01T00:00:00.000Z",
    createdBy: "admin",
    turkCatalogNumber: null,
    sealNames: null,
    sultanName: null
  },
  {
    id: "4",
    pick_number: "126",
    catalogId: "C126",
    country: "Ottoman Empire",
    denomination: "5 Kurush",
    year: "1915",
    series: "Emergency Issue",
    description: "An emergency issue banknote from WWI period.",
    imageUrls: ["/placeholder-brown.svg"],
    isApproved: true,
    isPending: false,
    createdAt: "2023-04-01T00:00:00.000Z",
    updatedAt: "2023-04-01T00:00:00.000Z",
    createdBy: "admin",
    turkCatalogNumber: "TK126",
    sealNames: "Mehmed V",
    sultanName: "Mehmed V"
  }
];

export const MOCK_MARKETPLACE_ITEMS: MarketplaceItem[] = [
  {
    id: "1",
    collectionItemId: "1",
    collectionItem: {
      id: "1",
      userId: "1",
      banknoteId: "1",
      banknote: MOCK_BANKNOTES[0],
      condition: "UNC",
      salePrice: 100,
      isForSale: true,
      publicNote: "Mint condition",
      privateNote: "Stored in a safe",
      purchasePrice: 50,
      purchaseDate: "2023-01-01T00:00:00.000Z",
      location: "Safe",
      orderIndex: 1,
      createdAt: "2023-01-01T00:00:00.000Z",
      updatedAt: "2023-01-01T00:00:00.000Z",
      personalImages: [
        "/images/ottoman-empire.jpg",
        "/images/palestine-mandate.jpg",
      ]
    },
    sellerId: "1",
    seller: {
      id: "1",
      username: "OttomanCollector",
      rank: "Advance Collector"
    },
    status: "Available",
    createdAt: "2023-01-01T00:00:00.000Z",
    updatedAt: "2023-01-01T00:00:00.000Z"
  },
  {
    id: "2",
    collectionItemId: "2",
    collectionItem: {
      id: "2",
      userId: "2",
      banknoteId: "2",
      banknote: MOCK_BANKNOTES[1],
      condition: "XF",
      salePrice: 75,
      isForSale: true,
      publicNote: "Great condition",
      orderIndex: 1,
      createdAt: "2023-02-01T00:00:00.000Z",
      updatedAt: "2023-02-01T00:00:00.000Z",
      personalImages: []
    },
    sellerId: "2",
    seller: {
      id: "2",
      username: "HistoryCollector",
      rank: "Casual Collector"
    },
    status: "Available",
    createdAt: "2023-02-01T00:00:00.000Z",
    updatedAt: "2023-02-01T00:00:00.000Z"
  }
];
