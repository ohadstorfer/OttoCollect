
import { supabase } from "@/integrations/supabase/client";

// This function can be used to import the CSV data into the Supabase database
// It would typically be run once from an admin interface or script
export async function importBanknoteData(csvData: string) {
  const lines = csvData.trim().split("\n");
  const headers = lines[0].split(",");
  
  const banknotes = [];
  
  // Parse CSV rows starting from row 1 (skipping header)
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) {
      console.error(`Row ${i} has incorrect number of values`);
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
  
  // Insert data in batches
  const batchSize = 50;
  for (let i = 0; i < banknotes.length; i += batchSize) {
    const batch = banknotes.slice(i, i + batchSize);
    const { error } = await supabase.from("detailed_banknotes").insert(batch);
    
    if (error) {
      console.error(`Error inserting batch ${i / batchSize}:`, error);
    } else {
      console.log(`Successfully inserted batch ${i / batchSize + 1}`);
    }
  }
  
  console.log(`Import complete, processed ${banknotes.length} banknotes`);
  return banknotes.length;
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
