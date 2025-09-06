import { CollectionItem, DetailedBanknote } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from 'xlsx';

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
  sortedItems?: CollectionItem[]; // This should be the properly sorted items from the page
  missingItems?: DetailedBanknote[];
  wishlistItems?: any[];
  // Add the same parameters used in CountryDetailCollection for consistent sorting
  currencies?: any[];
  sortFields?: string[];
  categoryOrder?: string[];
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
      getValue: (item) => {
        // Try multiple possible field names for extended pick number
        const extendedPick = item.banknote?.extendedPickNumber || 
                           (item as any).extendedPickNumber ||
                           (item as any).extended_pick_number ||
                           '';
        
        return extendedPick;
      }
    },
    {
      key: 'turk_catalog_number',
      header: 'Turk Catalog Number',
      required: false,
      getValue: (item) => item.banknote?.turkCatalogNumber || (item as any).turkCatalogNumber || ''
    },
    {
      key: 'face_value',
      header: 'Face Value',
      required: true,
      getValue: (item) => item.banknote?.denomination || (item as any).denomination || ''
    },
    {
      key: 'condition',
      header: 'Condition',
      required: true,
      getValue: (item) => {
        // Only return condition if item doesn't have grade
        return (item.condition && !item.grade) ? item.condition : '';
      }
    },
    {
      key: 'grade',
      header: 'Grade',
      required: true,
      getValue: (item) => {
        // Only return grade if item has grade
        if (!item.grade) return '';
        
        let gradeValue = '';
        if (item.grade_by) gradeValue += `${item.grade_by} `;
        gradeValue += item.grade;
        if (item.grade_condition_description) gradeValue += ` - ${item.grade_condition_description}`;
        
        return gradeValue;
      }
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
      getValue: (item) => item.banknote?.islamicYear || (item as any).islamicYear || (item as any).islamic_year || ''
    },
    {
      key: 'gregorian_year',
      header: 'Gregorian Year',
      required: true,
      getValue: (item) => item.banknote?.gregorianYear || item.banknote?.year || (item as any).gregorianYear || (item as any).gregorian_year || (item as any).year || ''
    },
    {
      key: 'signatures_front',
      header: 'Signatures Front',
      required: false,
      getValue: (item) => formatSignatures(item.banknote?.signaturesFront || (item as any).signaturesFront)
    },
    {
      key: 'signatures_back',
      header: 'Signatures Back',
      required: false,
      getValue: (item) => formatSignatures(item.banknote?.signaturesBack || (item as any).signaturesBack)
    },
    {
      key: 'seal_names',
      header: 'Seal Names',
      required: false,
      getValue: (item) => item.banknote?.sealNames || (item as any).sealNames || ''
    },
    {
      key: 'watermark',
      header: 'Watermark',
      required: true,
      getValue: (item) => item.banknote?.watermark || (item as any).watermark || ''
    },
    {
      key: 'sultan_name',
      header: 'Sultan Name',
      required: false,
      getValue: (item) => item.banknote?.sultanName || (item as any).sultanName || ''
    },
    {
      key: 'type',
      header: 'Type',
      required: true,
      getValue: (item) => item.banknote?.type || (item as any).type || ''
    },
    {
      key: 'category',
      header: 'Category',
      required: true,
      getValue: (item) => item.banknote?.category || (item as any).category || ''
    },
    {
      key: 'additional_info',
      header: 'Additional Info',
      required: true,
      getValue: (item) => item.banknote?.securityElement || (item as any).securityElement || ''
    },
    {
      key: 'public_note',
      header: 'Public Note',
      required: true,
      getValue: (item) => item.publicNote || ''
    }
  ];
}

export async function generateExcel(options: CSVExportOptions): Promise<ArrayBuffer> {
  const { activeTab, collectionItems, sortedItems } = options;
  
  // Use sorted items directly - they should already be properly sorted from CountryDetailCollection.tsx
  const itemsToExport: CollectionItem[] = sortedItems && sortedItems.length > 0 
    ? sortedItems 
    : (collectionItems || []);
  
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
      if (hasDataForField(itemsToExport, column.getValue)) {
        columnsToInclude.push(column);
      }
    }
  });
  
  // Prepare data for Excel
  const headers = ['Group', ...columnsToInclude.map(col => col.header)];
  const data: any[][] = [];
  
  // Add header row
  data.push(headers);
  
  // Add data rows
  itemsToExport.forEach(item => {
    const groupValue = getGroupValue(activeTab);
    const rowData = [groupValue];
    
    columnsToInclude.forEach(column => {
      const value = column.getValue(item);
      rowData.push(value || ''); // No need to escape for Excel
    });
    
    data.push(rowData);
  });
  
  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Collection');
  
  // Generate Excel file buffer
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
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

export function downloadExcel(excelBuffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
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
  
  return `${username}_${tabName}${country}_${timestamp}.xlsx`;
}

// Admin-specific interfaces and functions
export interface AdminExportOptions {
  countryId?: string;
  countryName?: string;
  banknotes?: any[]; // Optional: if omitted, we will fetch directly from DB
}

// Define all possible admin columns for detailed banknotes
function getAdminColumnDefinitions() {
  return [
    { key: 'extended_pick_number', header: 'Extended Pick Number', getValue: (item: any) => item.extended_pick_number || item.extendedPickNumber || '' },
    { key: 'pick_number', header: 'Pick Number', getValue: (item: any) => item.pick_number || item.pickNumber || '' },
    { key: 'turk_catalog_number', header: 'Turk Catalog Number', getValue: (item: any) => item.turk_catalog_number || item.turkCatalogNumber || '' },
    { key: 'face_value', header: 'Face Value', getValue: (item: any) => item.face_value || item.faceValue || item.denomination || '' },
    { key: 'islamic_year', header: 'Islamic Year', getValue: (item: any) => item.islamic_year || item.islamicYear || '' },
    { key: 'gregorian_year', header: 'Gregorian Year', getValue: (item: any) => item.gregorian_year || item.gregorianYear || item.year || '' },
    { key: 'signatures_front', header: 'Signatures Front', getValue: (item: any) => Array.isArray(item.signatures_front) ? item.signatures_front.join(', ') : (item.signatures_front || item.signaturesFront || '') },
    { key: 'signatures_back', header: 'Signatures Back', getValue: (item: any) => Array.isArray(item.signatures_back) ? item.signatures_back.join(', ') : (item.signatures_back || item.signaturesBack || '') },
    { key: 'seal_names', header: 'Seal Names', getValue: (item: any) => item.seal_names || item.sealNames || '' },
    { key: 'watermark', header: 'Watermark', getValue: (item: any) => item.watermark || '' },
    { key: 'sultan_name', header: 'Sultan Name', getValue: (item: any) => item.sultan_name || item.sultanName || '' },
    { key: 'type', header: 'Type', getValue: (item: any) => item.type || '' },
    { key: 'category', header: 'Category', getValue: (item: any) => item.category || '' },
    { key: 'rarity', header: 'Rarity', getValue: (item: any) => item.rarity || '' },
    { key: 'security_element', header: 'Security Element', getValue: (item: any) => item.security_element || item.securityElement || '' },
    { key: 'colors', header: 'Colors', getValue: (item: any) => item.colors || '' },
    { key: 'serial_numbering', header: 'Serial Numbering', getValue: (item: any) => item.serial_numbering || item.serialNumbering || '' },
    { key: 'printer', header: 'Printer', getValue: (item: any) => item.printer || '' },
    { key: 'dimensions', header: 'Dimensions', getValue: (item: any) => item.dimensions || '' },
    { key: 'banknote_description', header: 'Banknote Description', getValue: (item: any) => item.banknote_description || item.description || '' },
    { key: 'historical_description', header: 'Historical Description', getValue: (item: any) => item.historical_description || '' },
    { key: 'front_picture', header: 'Front Picture URL', getValue: (item: any) => item.front_picture || item.frontPicture || '' },
    { key: 'back_picture', header: 'Back Picture URL', getValue: (item: any) => item.back_picture || item.backPicture || '' }
  ];
}

export async function generateAdminExcel(options: AdminExportOptions): Promise<ArrayBuffer> {
  const { countryId, countryName, banknotes } = options;

  // 1) Fetch records directly from DB using snake_case to avoid mapping issues
  let records: any[] = [];
  try {
    if (countryId) {
      const { data, error } = await supabase.rpc('catalog_banknotes_sorted_by_country', { country_id: countryId });
      if (error) throw error;
      records = data || [];
    } else if (countryName) {
      const { data, error } = await supabase
        .from('detailed_banknotes')
        .select('*')
        .eq('country', countryName)
        .eq('is_approved', true)
        .order('extended_pick_number', { ascending: true });
      if (error) throw error;
      records = data || [];
    } else if (banknotes && banknotes.length) {
      // Fallback: use provided data if no country specified
      records = banknotes;
    }
  } catch (e: any) {
    throw new Error(`Failed to fetch banknotes for export: ${e?.message || e}`);
  }

  if (!records || records.length === 0) {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([["No data"]]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Banknotes');
    return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  }

  // Sort records by extended pick number using the same logic as use-optimized-banknote-sorting.ts
  const parseExtPick = (pick: string) => {
    const regex = /^(\d+)(.*)$/; // Changed to capture everything after the initial number
    const match = (pick || "").match(regex);

    if (!match) {
      return {
        base_num: 0,
        raw_suffix: "",
      };
    }

    const base_num = parseInt(match[1], 10);
    const raw_suffix = match[2] || "";
    return { base_num, raw_suffix };
  };

  const classifySuffix = (suffix: string) => {
    if (!suffix) {
      return { group: 0, rank: 0, raw: "" }; // no suffix
    }

    // lowercase (including mixed alphanumeric like "a1", "c1")
    if (/^[a-z]+(\d+)?$/.test(suffix)) {
      const letterPart = suffix.match(/^[a-z]+/)?.[0] || "";
      const numberPart = suffix.match(/\d+$/)?.[0] || "";
      
      if (suffix.length === 1) {
        // Single lowercase letter like "a", "b", "c"
        return { group: 1, rank: letterPart.charCodeAt(0) * 1000, raw: suffix };
      } else if (numberPart) {
        // Mixed alphanumeric like "a1", "c1" - should come right after the base letter
        const numValue = parseInt(numberPart, 10);
        return { group: 1, rank: letterPart.charCodeAt(0) * 1000 + numValue, raw: suffix };
      } else {
        // Multi-letter lowercase like "aa", "ab"
        return { group: 2, rank: letterPart.charCodeAt(0), raw: suffix };
      }
    }

    // uppercase
    if (/^[A-Z]+$/.test(suffix)) {
      if (suffix.length === 1) {
        return { group: 3, rank: suffix.charCodeAt(0), raw: suffix }; // single uppercase
      } else {
        return { group: 4, rank: suffix.charCodeAt(0), raw: suffix }; // multi-letter uppercase (Abs…)
      }
    }

    // mixed-case like "Abs" -> treat as uppercase extended
    if (/^[A-Z][a-zA-Z]*$/.test(suffix)) {
      return { group: 4, rank: suffix.charCodeAt(0), raw: suffix };
    }

    // fallback
    return { group: 5, rank: 0, raw: suffix };
  };

  records.sort((a: any, b: any) => {
    const aPick = parseExtPick(a.extended_pick_number || a.extendedPickNumber || "");
    const bPick = parseExtPick(b.extended_pick_number || b.extendedPickNumber || "");

    if (aPick.base_num !== bPick.base_num) {
      return aPick.base_num - bPick.base_num;
    } else {
      const aClass = classifySuffix(aPick.raw_suffix);
      const bClass = classifySuffix(bPick.raw_suffix);

      // Compare groups first
      if (aClass.group !== bClass.group) {
        return aClass.group - bClass.group;
      } else if (aClass.rank !== bClass.rank) {
        return aClass.rank - bClass.rank;
      } else {
        // tie-breaker: full string compare
        return aClass.raw.localeCompare(bClass.raw);
      }
    }
  });

  // 2) Determine columns dynamically and exclude specified fields
  const excludeKeys = new Set<string>([
    'updated_at', 'created_at', 'is_pending', 'is_approved',
    'back_picture_thumbnail', 'front_picture_thumbnail',
    'back_picture_watermarked', 'front_picture_watermarked',
    'front_picture', 'back_picture','other_element_pictures','id' // Exclude Front Picture URL and Back Picture URL from admin export
  ]);

  const allKeysSet = new Set<string>();
  records.forEach(r => {
    Object.keys(r || {}).forEach(k => {
      if (!excludeKeys.has(k)) allKeysSet.add(k);
    });
  });

  // Preferred ordering for readability
  const preferredOrder = [
    'country', 'extended_pick_number', 'pick_number', 'turk_catalog_number',
    'face_value', 'islamic_year', 'gregorian_year',
    'signatures_front', 'signatures_back', 'signature_pictures',
    'seal_names', 'seal_pictures',
    'watermark_picture', 'other_element_pictures',
    'front_picture', 'back_picture',
    'sultan_name', 'tughra_picture', 'printer',
    'type', 'category', 'rarity', 'security_element',
    'colors', 'serial_numbering',
    'banknote_description', 'historical_description',
    'dimensions'
  ];

  const remainingKeys = Array.from(allKeysSet).filter(k => !preferredOrder.includes(k)).sort();
  const orderedKeys = [...preferredOrder.filter(k => allKeysSet.has(k)), ...remainingKeys];

  const headerForKey = (key: string): string => {
    const mapping: Record<string, string> = {
      front_picture: 'Front Picture URL',
      back_picture: 'Back Picture URL',
      watermark_picture: 'Watermark Picture URL',
      tughra_picture: 'Tughra Picture URL',
      seal_pictures: 'Seal Pictures',
      signature_pictures: 'Signature Pictures',
      other_element_pictures: 'Other Element Pictures',
      extended_pick_number: 'Extended Pick Number',
      pick_number: 'Pick Number',
      turk_catalog_number: 'Turk Catalog Number',
      face_value: 'Face Value',
      islamic_year: 'Islamic Year',
      gregorian_year: 'Gregorian Year',
      sultan_name: 'Sultan Name',
      serial_numbering: 'Serial Numbering',
      banknote_description: 'Banknote Description',
      historical_description: 'Historical Description',
      seal_names: 'Seal Names'
    };
    if (mapping[key]) return mapping[key];
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const toCellValue = (v: any): string => {
    if (v === null || v === undefined) return '';
    if (Array.isArray(v)) return v.filter(Boolean).join(', ');
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  };

  const headers = orderedKeys.map(headerForKey);
  const data: any[][] = [headers];

  records.forEach(rec => {
    const row = orderedKeys.map(k => toCellValue((rec as any)[k]));
    data.push(row);
  });

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Banknotes');
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
}


export function generateAdminFilename(countryName: string, adminUsername: string): string {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const country = countryName.replace(/\s+/g, '_');
  
  return `${adminUsername}_${country}_banknotes_${timestamp}.xlsx`;
}