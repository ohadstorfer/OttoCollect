
import { DetailedBanknote } from "@/types";

const ITEMS_PER_PAGE = 12;

export const fetchBanknotes = async (
  countryId: string,
  currentPage: number = 1,
  search?: string,
  categories?: string[],
  types?: string[],
  sort?: string[]
) => {
  try {
    // Mock implementation since we don't have direct DB access
    console.log("Mocking fetchBanknotes with params:", { countryId, currentPage, search, categories, types, sort });
    
    // Return mock data
    return {
      data: [],
      pageCount: 0,
      totalCount: 0,
    };
  } catch (error) {
    console.error("Error fetching banknotes:", error);
    return {
      data: [],
      pageCount: 0,
      totalCount: 0,
    };
  }
};

// Rename function from fetchBanknoteDetailsById to fetchBanknoteById to match imports in other files
export const fetchBanknoteById = async (banknoteId: string): Promise<DetailedBanknote | null> => {
  try {
    console.log("Mocking fetchBanknoteById with id:", banknoteId);
    
    // Return mock data with the required structure
    const mockBanknote: DetailedBanknote = {
      id: banknoteId,
      catalogId: "MOCK-123",
      country: "Mock Country",
      denomination: "100",
      year: "2023",
      series: "Series X",
      description: "Mock banknote description",
      imageUrls: ["https://placehold.co/600x400", "https://placehold.co/600x400"],
      isApproved: true,
      isPending: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pickNumber: "123",
      extendedPickNumber: "123A",
      sultanName: "Mock Sultan",
      type: "Regular Issue",
      category: "Modern"
    };
    
    return mockBanknote;
  } catch (error) {
    console.error("Error fetching banknote details:", error);
    return null;
  }
};
