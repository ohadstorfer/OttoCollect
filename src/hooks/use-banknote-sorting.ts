
import { useMemo } from 'react';
import { DetailedBanknote } from '@/types';

interface Currency {
  id: string;
  name: string;
  display_order: number;
  country_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface UseBanknoteSortingProps {
  banknotes: DetailedBanknote[];
  currencies: Currency[];
  sortFields: string[];
}

export const useBanknoteSorting = ({ 
  banknotes, 
  currencies, 
  sortFields 
}: UseBanknoteSortingProps) => {
  return useMemo(() => {
    if (!banknotes || !Array.isArray(banknotes) || banknotes.length === 0) {
      return [];
    }

    // Make a copy of the banknotes array to avoid mutating the original
    const sortedBanknotes = [...banknotes];

    // Apply sorting based on the provided sort fields
    sortedBanknotes.sort((a, b) => {
      // Apply each sort field in order of priority
      for (const field of sortFields) {
        let comparison = 0;

        switch (field) {
          case 'sultan':
            comparison = (a.sultanName || '').localeCompare(b.sultanName || '');
            break;

          case 'faceValue':
            // Extract currency information
            const valueA = a.denomination || a.face_value || '';
            const valueB = b.denomination || b.face_value || '';
            
            // Check for kurush vs lira (kurush comes before lira)
            const isKurushA = String(valueA).toLowerCase().includes('kurush');
            const isKurushB = String(valueB).toLowerCase().includes('kurush');
            const isLiraA = String(valueA).toLowerCase().includes('lira');
            const isLiraB = String(valueB).toLowerCase().includes('lira');
            
            if (isKurushA && isLiraB) comparison = -1;
            else if (isLiraA && isKurushB) comparison = 1;
            else {
              // Extract numeric values for comparison
              const numA = parseFloat(String(valueA).replace(/[^0-9.]/g, '')) || 0;
              const numB = parseFloat(String(valueB).replace(/[^0-9.]/g, '')) || 0;
              comparison = numA - numB;
            }
            break;

          case 'extPick':
            // Compare by extended pick number
            comparison = 
              String(a.extendedPickNumber || a.catalogId || a.extended_pick_number || '')
                .localeCompare(
                  String(b.extendedPickNumber || b.catalogId || b.extended_pick_number || '')
                );
            break;
            
          case 'newest':
            // Compare by creation date if available
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            comparison = dateB - dateA; // Newest first
            break;
            
          // Add additional sort options as needed
        }

        // If we found a difference, return it
        if (comparison !== 0) {
          return comparison;
        }
      }

      // If all sort criteria match, maintain original order
      return 0;
    });

    return sortedBanknotes;
  }, [banknotes, currencies, sortFields]);
};
