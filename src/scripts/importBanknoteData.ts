import { supabase } from "@/integrations/supabase/client";

// This function can be used to import the CSV data into the Supabase database
// It would typically be run once from an admin interface or script
export async function importBanknoteData(csvData: string) {
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
      console.error(`Row ${i} has incorrect number of values. Expected ${headers.length}, got ${values.length}`);
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
      if (["signature_pictures", "seal_pictures", "other_element_pictures"].includes(header) && value) {
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
    }
  }
  
  console.log(`Parsed ${banknotes.length} valid banknotes from CSV`);
  
  if (banknotes.length === 0) {
    throw new Error("No valid banknotes found in CSV file");
  }
  
  // Insert data in batches
  const batchSize = 50;
  let importedCount = 0;
  
  for (let i = 0; i < banknotes.length; i += batchSize) {
    const batch = banknotes.slice(i, i + batchSize);
    console.log(`Inserting batch ${i / batchSize + 1} with ${batch.length} items`);
    
    const { error } = await supabase
      .from('detailed_banknotes')
      .insert(batch);
    
    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
      throw new Error(`Database insertion failed: ${error.message}`);
    } else {
      console.log(`Successfully inserted batch ${i / batchSize + 1}`);
      importedCount += batch.length;
    }
  }
  
  console.log(`Import complete, processed ${importedCount} banknotes`);
  return importedCount;
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
