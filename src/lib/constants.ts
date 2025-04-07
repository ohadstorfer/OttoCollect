
import { BanknoteCondition } from '@/types';

// Add condition labels for display
export const CONDITION_LABELS: Record<BanknoteCondition, string> = {
  "UNC": "Uncirculated",
  "AU": "About Uncirculated",
  "XF": "Extremely Fine",
  "VF": "Very Fine",
  "F": "Fine",
  "VG": "Very Good",
  "G": "Good",
  "Fair": "Fair",
  "Poor": "Poor"
};

// Update marketplace fixtures if needed
export const MARKETPLACE_FIXTURES = [
  {
    id: "m1",
    collectionItemId: "c1",
    sellerId: "u1",
    status: "Available",
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2023-01-01T00:00:00Z",
  }
];
