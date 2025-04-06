
import { supabase } from "@/integrations/supabase/client";

// This function can be used to import the CSV data into the Supabase database
// It would typically be run once from an admin interface or script
export async function importBanknoteData(csvData: string) {
  console.log("Starting banknote data import...");
  const lines = csvData.trim().split("\n");
  const headers = lines[0].split(",");
  
  console.log(`CSV has ${lines.length - 1} rows and ${headers.length} columns`);
  console.log("Headers:", headers);
  
  const banknotes = [];
  
  // Parse CSV rows starting from row 1 (skipping header)
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) {
      console.error(`Row ${i} has incorrect number of values. Expected ${headers.length}, got ${values.length}`);
      continue;
    }
    
    const banknote: Record<string, any> = {};
    headers.forEach((header, index) => {
      // Handle array fields
      if (["signature_pictures", "seal_pictures", "other_element_pictures"].includes(header) && values[index]) {
        banknote[header] = values[index].split("|");
      } else {
        banknote[header] = values[index];
      }
    });
    
    // Set default values for required fields
    banknote.is_approved = true;
    banknote.is_pending = false;
    
    banknotes.push(banknote);
  }
  
  console.log(`Prepared ${banknotes.length} banknotes for import`);
  
  // Insert data in batches
  const batchSize = 50;
  let importedCount = 0;
  
  for (let i = 0; i < banknotes.length; i += batchSize) {
    const batch = banknotes.slice(i, i + batchSize);
    console.log(`Inserting batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(banknotes.length / batchSize)}...`);
    // Using `from` with a type assertion to handle the TypeScript errors
    const { data, error } = await supabase
      .from('detailed_banknotes' as any)
      .insert(batch);
    
    if (error) {
      console.error(`Error inserting batch ${i / batchSize}:`, error);
    } else {
      console.log(`Successfully inserted batch ${Math.floor(i / batchSize) + 1}`);
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
