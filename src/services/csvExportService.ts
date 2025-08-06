import { CollectionItem, DetailedBanknote } from "@/types";
import { supabase } from "@/integrations/supabase/client";

export interface CSVColumn {
  key: string;
  header: string;
  required: boolean;
  getValue: (item: CollectionItem) => string;
}

export interface CSVExportOptions {
  activeTab: 'collection' | 'wishlist' | 'missing' | 'sale';
  userId: string;
  countryName?: string;
  collectionItems: CollectionItem[];
  missingItems?: DetailedBanknote[];
  wishlistItems?: any[];
}

// Helper function to escape CSV values
function escapeCSVValue(value: string | undefined | null): string {
  if (!value) return '';
  const stringValue = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

// Helper function to join array values
function joinArrayValues(arr: string[] | undefined | null): string {
  if (!arr || !Array.isArray(arr)) return '';
  return arr.filter(Boolean).join(', ');
}

// Helper function to format signatures (handle pipe-separated values)
function formatSignatures(signatures: string | string[] | undefined | null): string {
  if (!signatures) return '';
  
  if (typeof signatures === 'string') {
    // Handle pipe-separated signatures like "L. Couper|p. Ezechiel|A.J.Harding"
    return signatures.split('|').map(sig => sig.trim()).filter(Boolean).join(', ');
  }
  
  if (Array.isArray(signatures)) {
    // Handle array of signatures
    return signatures
      .map(sig => typeof sig === 'string' ? sig.split('|').map(s => s.trim()).join(', ') : sig)
      .filter(Boolean)
      .join(', ');
  }
  
  return '';
}

// Check if any collection item has data for a specific field
function hasDataForField(items: CollectionItem[], fieldGetter: (item: CollectionItem) => string): boolean {
  return items.some(item => {
    const value = fieldGetter(item);
    return value && value.trim() !== '';
  });
}

// Define all possible columns
function getColumnDefinitions(): CSVColumn[] {
  return [
    {
      key: 'extended_pick_number',
      header: 'Extended Pick Number',
      required: true,
      getValue: (item) => item.banknote?.extendedPickNumber || ''
    },
    {
      key: 'turk_catalog_number',
      header: 'Turk Catalog Number',
      required: false,
      getValue: (item) => item.banknote?.turkCatalogNumber || ''
    },
    {
      key: 'face_value',
      header: 'Face Value',
      required: true,
      getValue: (item) => item.banknote?.denomination || ''
    },
    {
      key: 'condition',
      header: 'Condition',
      required: true,
      getValue: (item) => item.condition || ''
    },
    {
      key: 'prefix',
      header: 'Prefix',
      required: true,
      getValue: (item) => item.prefix || ''
    },
    {
      key: 'islamic_year',
      header: 'Islamic Year',
      required: true,
      getValue: (item) => item.banknote?.islamicYear || ''
    },
    {
      key: 'gregorian_year',
      header: 'Gregorian Year',
      required: true,
      getValue: (item) => item.banknote?.gregorianYear || item.banknote?.year || ''
    },
    {
      key: 'signatures_front',
      header: 'Signatures Front',
      required: false,
      getValue: (item) => formatSignatures(item.banknote?.signaturesFront)
    },
    {
      key: 'signatures_back',
      header: 'Signatures Back',
      required: false,
      getValue: (item) => formatSignatures(item.banknote?.signaturesBack)
    },
    {
      key: 'seal_names',
      header: 'Seal Names',
      required: false,
      getValue: (item) => item.banknote?.sealNames || ''
    },
    {
      key: 'watermark',
      header: 'Watermark',
      required: true,
      getValue: (item) => item.banknote?.watermark || ''
    },
    {
      key: 'sultan_name',
      header: 'Sultan Name',
      required: false,
      getValue: (item) => item.banknote?.sultanName || ''
    },
    {
      key: 'type',
      header: 'Type',
      required: true,
      getValue: (item) => item.banknote?.type || ''
    },
    {
      key: 'category',
      header: 'Category',
      required: true,
      getValue: (item) => item.banknote?.category || ''
    },
    {
      key: 'additional_info',
      header: 'Additional Info',
      required: true,
      getValue: (item) => item.banknote?.securityElement || ''
    },
    {
      key: 'public_note',
      header: 'Public Note',
      required: true,
      getValue: (item) => item.publicNote || ''
    }
  ];
}

export async function generateCSV(options: CSVExportOptions): Promise<string> {
  const { activeTab, collectionItems, countryName } = options;
  
  // Get all column definitions
  const allColumns = getColumnDefinitions();
  
  // Determine which columns to include
  const columnsToInclude: CSVColumn[] = [];
  
  // Always include required columns
  allColumns.forEach(column => {
    if (column.required) {
      columnsToInclude.push(column);
    } else {
      // For optional columns, only include if data exists
      if (hasDataForField(collectionItems, column.getValue)) {
        columnsToInclude.push(column);
      }
    }
  });
  
  // Build CSV content
  const headers = ['Group', ...columnsToInclude.map(col => col.header)];
  const csvRows: string[] = [];
  
  // Add header row
  csvRows.push(headers.map(escapeCSVValue).join(','));
  
  // Add data rows
  collectionItems.forEach(item => {
    const groupValue = getGroupValue(activeTab);
    const rowData = [groupValue];
    
    columnsToInclude.forEach(column => {
      const value = column.getValue(item);
      rowData.push(escapeCSVValue(value));
    });
    
    csvRows.push(rowData.join(','));
  });
  
  // Add UTF-8 BOM for proper Excel handling
  return '\uFEFF' + csvRows.join('\n');
}

function getGroupValue(activeTab: string): string {
  switch (activeTab) {
    case 'collection':
      return 'My collection';
    case 'missing':
      return 'Missing items';
    case 'wishlist':
      return 'Wish list';
    case 'sale':
      return 'Market place';
    default:
      return 'Collection';
  }
}

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export function generateFilename(
  activeTab: string, 
  username: string, 
  countryName?: string
): string {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const tabName = getGroupValue(activeTab).replace(/\s+/g, '_');
  const country = countryName ? `_${countryName.replace(/\s+/g, '_')}` : '';
  
  return `${username}_${tabName}${country}_${timestamp}.csv`;
}