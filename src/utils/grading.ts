export function getGradeDescription(grade: number): string {
  if (grade === 70) return 'Gem Unc';
  if (grade >= 67 && grade <= 69) return 'Superb Gem Unc';
  if (grade >= 65 && grade <= 66) return 'Gem Uncirculated';
  if (grade >= 63 && grade <= 64) return 'Choice Uncirculated';
  if (grade >= 60 && grade <= 62) return 'Uncirculated';
  if (grade === 58) return 'Choice About Unc';
  if (grade >= 50 && grade <= 55) return 'About Uncirculated';
  if (grade === 45) return 'Choice Extremely Fine';
  if (grade === 40) return 'Extremely Fine';
  if (grade === 35) return 'Choice Very Fine';
  if (grade >= 20 && grade <= 30) return 'Very Fine';
  if (grade === 15) return 'Choice Fine';
  if (grade === 12) return 'Fine';
  if (grade >= 8 && grade <= 10) return 'Very Good';
  if (grade >= 4 && grade <= 6) return 'Good';
  if (grade === 3) return 'About Good';
  if (grade === 2) return 'Fair';
  if (grade === 1) return 'Poor';
  return ;
} 