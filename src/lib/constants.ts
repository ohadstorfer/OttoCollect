
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
