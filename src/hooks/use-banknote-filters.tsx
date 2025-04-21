
import { useState, useEffect } from 'react';
import { BanknoteFilterState } from '@/types';

// Define a default state for filters
const defaultFilters: BanknoteFilterState = {
  search: '',
  categories: [],
  types: [],
  sort: ['extPick'], // Default sort by extended pick number
};

export function useBanknoteFilters(initialFilters?: Partial<BanknoteFilterState>) {
  const [filters, setFilters] = useState<BanknoteFilterState>({
    ...defaultFilters,
    ...initialFilters,
  });

  // Optionally, you could add persistence to localStorage
  useEffect(() => {
    const savedFilters = localStorage.getItem('banknote-filters');
    if (savedFilters) {
      try {
        const parsedFilters = JSON.parse(savedFilters);
        setFilters(prev => ({
          ...prev,
          ...parsedFilters,
        }));
      } catch (e) {
        console.error('Failed to parse saved filters:', e);
      }
    }
  }, []);

  // Save filters to localStorage when they change
  useEffect(() => {
    localStorage.setItem('banknote-filters', JSON.stringify(filters));
  }, [filters]);

  return [filters, setFilters] as const;
}
