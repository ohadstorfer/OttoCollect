import { BanknoteCondition } from "@/types";

export const COUNTRIES = [
  "Turkey",
  "Germany",
  "United Kingdom",
  "France",
  "United States",
  "Italy",
  "Spain",
  "Canada",
  "Australia",
  "Japan",
  "China",
  "India",
  "Brazil",
  "Mexico",
  "Russia",
  "South Africa",
  "Argentina",
  "Nigeria",
  "Egypt",
  "Saudi Arabia",
];

export const DEFAULT_IMAGE_URL = "/placeholder.svg";

export const CONDITION_DESCRIPTIONS: Record<BanknoteCondition, string> = {
  'UNC': 'Uncirculated - Perfect condition with no signs of handling or wear',
  'AU': 'About Uncirculated - Minimal signs of handling with full crispness',
  'XF': 'Extremely Fine - Minor signs of handling with strong crispness',
  'VF': 'Very Fine - Some signs of circulation but still crisp',
  'F': 'Fine - Significant circulation with some soil or folds',
  'VG': 'Very Good - Heavy circulation with multiple folds',
  'G': 'Good - Very heavy circulation with wear on edges',
  'FR': 'Fair - Extensive wear with possible tears or pieces missing',
  'Fair': 'Fair - Extensive wear with possible tears or pieces missing',
  'Poor': 'Poor - Extremely worn, possibly damaged with tears or holes'
};
