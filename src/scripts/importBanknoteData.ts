import { supabase } from "@/integrations/supabase/client";

interface BanknoteImportResult {
  importedCount: number;
  skippedCount: number;
  errors: string[];
}

// Helper function to check for existing banknotes in a batch
async function checkExistingBanknotes(banknotes: Record<string, any>[]) {
  const compositeKeys = banknotes.map(b => ({
    country: b.country,
    extended_pick_number: b.extended_pick_number
  }));

  // Create an OR condition for each composite key
  const orConditions = compositeKeys.map(key => 
    `(country.ilike.${key.country} and extended_pick_number.ilike.${key.extended_pick_number})`
  ).join(',');

  const { data, error } = await supabase
    .from('detailed_banknotes')
    .select('*')  // Select all fields to compare
    .or(orConditions);

  if (error) {
    throw new Error(`Failed to check existing banknotes: ${error.message}`);
  }

  // Create a Map of composite keys to full banknote data for comparison
  const existingBanknotes = new Map(
    data?.map(b => [
      `${b.country.toLowerCase()}:${b.extended_pick_number.toLowerCase()}`,
      b
    ])
  );

  return existingBanknotes;
}

// This function can be used to import the CSV data into the Supabase database
// It would typically be run once from an admin interface or script
export async function importBanknoteData(csvData: string): Promise<BanknoteImportResult> {
  // Initialize result object
  const result: BanknoteImportResult = {
    importedCount: 0,
    skippedCount: 0,
    errors: []
  };

  // Normalize line endings and trim whitespace
  const normalizedCsvData = csvData.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const lines = normalizedCsvData.split("\n");
  
  if (lines.length === 0) {
    throw new Error("CSV file is empty");
  }
  
  // Parse and clean headers
  const headers = parseCSVLine(lines[0]).map(header => header.trim());
  console.log("Parsed headers:", headers);
  
  const banknotes = [];
  
  // Parse CSV rows starting from row 1 (skipping header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    const values = parseCSVLine(line);
    if (values.length !== headers.length) {
      result.errors.push(`Row ${i} has incorrect number of values. Expected ${headers.length}, got ${values.length}`);
      continue;
    }
    
    const banknote: Record<string, any> = {};
    headers.forEach((header, index) => {
      const value = values[index].trim();
      
      // Skip empty id values (let database generate them)
      if (header === 'id' && !value) {
        return;
      }
      
      // Handle array fields - these need special parsing for JSON arrays
      if (["signature_pictures","signatures_front", "signatures_back", "seal_pictures", "other_element_pictures"].includes(header) && value) {
        try {
          let cleanValue = value.trim();
          
          // Remove any type of quotes from the beginning and end
          while ((cleanValue.startsWith('"') || cleanValue.startsWith("'")) && 
                 (cleanValue.endsWith('"') || cleanValue.endsWith("'"))) {
            cleanValue = cleanValue.slice(1, -1);
          }

          // Replace double quotes with single quotes temporarily
          cleanValue = cleanValue.replace(/""/g, '"');
          
          try {
            // Try to parse as JSON first
            const parsedArray = JSON.parse(cleanValue);
            if (Array.isArray(parsedArray)) {
              banknote[header] = parsedArray.filter(Boolean);
            } else {
              banknote[header] = [parsedArray].filter(Boolean);
            }
          } catch (jsonError) {
            // If JSON parsing fails, try the bracket format
            if (cleanValue.startsWith('[') && cleanValue.endsWith(']')) {
              // Remove brackets
              cleanValue = cleanValue.slice(1, -1);
              
              // Split by comma and clean up each item
              const items = cleanValue.split(',').map(item => {
                item = item.trim();
                // Remove any remaining quotes around items
                while ((item.startsWith('"') || item.startsWith("'")) && 
                       (item.endsWith('"') || item.endsWith("'"))) {
                  item = item.slice(1, -1);
                }
                return item;
              });
              
              // Filter out empty values and create proper JSON array
              banknote[header] = items.filter(Boolean);
            } else {
              // Fallback to pipe-separated values
              banknote[header] = cleanValue.split("|").map(item => item.trim()).filter(Boolean);
            }
          }
        } catch (error) {
          console.warn(`Failed to parse array for ${header}, using empty array:`, error);
          banknote[header] = [];
        }
      } else if (value) {
        banknote[header] = value;
      }
    });
    
    // Set default values for required fields if not provided
    if (!banknote.is_approved && banknote.is_approved !== false) {
      banknote.is_approved = true;
    }
    if (!banknote.is_pending && banknote.is_pending !== false) {
      banknote.is_pending = false;
    }
    
    // Only add banknote if it has required fields
    if (banknote.country && banknote.extended_pick_number && banknote.face_value) {
      banknotes.push(banknote);
    } else {
      result.errors.push(`Row ${i} missing required fields (country, extended_pick_number, or face_value)`);
    }
  }
  
  console.log(`Parsed ${banknotes.length} valid banknotes from CSV`);
  
  if (banknotes.length === 0) {
    throw new Error("No valid banknotes found in CSV file");
  }
  
  // Process data in batches
  const batchSize = 50;
  
  for (let i = 0; i < banknotes.length; i += batchSize) {
    const batch = banknotes.slice(i, i + batchSize);
    console.log(`Processing batch ${i / batchSize + 1} with ${batch.length} items`);
    
    try {
      // Check for existing banknotes in this batch
      const existingBanknotes = await checkExistingBanknotes(batch);
      
      const newBanknotes = [];
      const updateBanknotes = [];
      
      for (const banknote of batch) {
        const compositeKey = `${banknote.country.toLowerCase()}:${banknote.extended_pick_number.toLowerCase()}`;
        const existingBanknote = existingBanknotes.get(compositeKey);
        
        if (!existingBanknote) {
          // New banknote, add to insert list
          newBanknotes.push(banknote);
          continue;
        }

        // Compare all fields except id, created_at, and updated_at
        const hasChanges = Object.entries(banknote).some(([key, value]) => {
          if (['id', 'created_at', 'updated_at'].includes(key)) return false;
          
          // Handle array fields
          if (Array.isArray(value)) {
            const existingValue = existingBanknote[key] || [];
            if (value.length !== existingValue.length) return true;
            return value.some((v, i) => v !== existingValue[i]);
          }
          
          return value !== existingBanknote[key];
        });

        if (hasChanges) {
          // Add to update list if there are changes
          updateBanknotes.push({
            id: existingBanknote.id,
            ...banknote
          });
        } else {
          result.skippedCount++;
          result.errors.push(`Skipped identical banknote: ${banknote.country} - ${banknote.extended_pick_number}`);
        }
      }
      
      // Insert new banknotes
      if (newBanknotes.length > 0) {
        const { error: insertError } = await supabase
          .from('detailed_banknotes')
          .insert(newBanknotes);
        
        if (insertError) {
          throw insertError;
        }
        
        result.importedCount += newBanknotes.length;
        console.log(`Successfully inserted ${newBanknotes.length} new banknotes from batch ${i / batchSize + 1}`);
      }

      // Update changed banknotes
      if (updateBanknotes.length > 0) {
        for (const banknote of updateBanknotes) {
          const { error: updateError } = await supabase
            .from('detailed_banknotes')
            .update(banknote)
            .eq('id', banknote.id);
          
          if (updateError) {
            result.errors.push(`Failed to update banknote ${banknote.country} - ${banknote.extended_pick_number}: ${updateError.message}`);
            continue;
          }
          
          result.importedCount++;
          console.log(`Successfully updated banknote: ${banknote.country} - ${banknote.extended_pick_number}`);
        }
      }
    } catch (error) {
      console.error(`Error processing batch ${i / batchSize + 1}:`, error);
      result.errors.push(`Batch ${i / batchSize + 1} error: ${error.message}`);
    }
  }

  console.log(`Import complete. Imported/Updated: ${result.importedCount}, Skipped: ${result.skippedCount}, Errors: ${result.errors.length}`);
  return result;
}

// Helper function to correctly parse CSV lines that might contain commas within quotes
function parseCSVLine(line: string): string[] {
  const result = [];
  let insideQuotes = false;
  let currentValue = "";
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      result.push(currentValue);
      currentValue = "";
    } else {
      currentValue += char;
    }
  }
  
  // Add the last value
  result.push(currentValue);
  
  return result;
}
