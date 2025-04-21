
import { DetailedBanknote } from "@/types";
import type { CurrencyDefinition } from "@/services/currencyService";

// Parse/extract currency from a denomination string like "5 para", "1 lira", etc.
export function extractCurrency(denomination: string): string {
  if (!denomination) return "";
  // Currency is assumed to be the last word ("5 para" → "para", "0.5 lira" → "lira")
  const parts = denomination.trim().split(" ");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

// Extract numeric value from "5 para", "0.25 lira", "10 kurus", etc.
export function extractFaceValue(denomination: string): number {
  if (!denomination) return 0;
  // Try extracting number (could be decimal), return 0 if not found
  const match = denomination.match(/[0-9]+(\.[0-9]+)?/);
  return match ? parseFloat(match[0]) : 0;
}

// Enhanced sort for banknotes: by currency display_order, then by numeric face value
export function sortBanknotesByCurrencyAndValue(
  banknotes: DetailedBanknote[],
  currencyDefs: CurrencyDefinition[]
): DetailedBanknote[] {
  // Map currency names to display_order for fast lookup
  const orderMap: { [key: string]: number } = {};
  for (const c of currencyDefs) {
    orderMap[c.name.toLowerCase()] = c.display_order;
  }
  return [...banknotes].sort((a, b) => {
    const currencyA = extractCurrency(a.denomination);
    const currencyB = extractCurrency(b.denomination);
    const orderA = orderMap[currencyA] ?? 99;
    const orderB = orderMap[currencyB] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    // Equal currency, then sort by numeric value
    return extractFaceValue(a.denomination) - extractFaceValue(b.denomination);
  });
}

// Group banknotes by currency, preserving order
export function groupBanknotesByCurrency(
  banknotes: DetailedBanknote[],
  currencyDefs: CurrencyDefinition[]
): {
  currency: string;
  currencyDisplay: string;
  currencyDisplayOrder: number;
  items: DetailedBanknote[];
}[] {
  // Map for grouping, list for order
  const orderMap: { [key: string]: CurrencyDefinition } = {};
  currencyDefs.forEach(cd => (orderMap[cd.name.toLowerCase()] = cd));

  // Build groups in order
  const groups: {
    currency: string;
    currencyDisplay: string;
    currencyDisplayOrder: number;
    items: DetailedBanknote[];
  }[] = [];

  for (const c of currencyDefs) {
    const items = banknotes.filter(
      note =>
        extractCurrency(note.denomination) === c.name.toLowerCase()
    );
    if (items.length) {
      groups.push({
        currency: c.name.toLowerCase(),
        currencyDisplay: c.name,
        currencyDisplayOrder: c.display_order,
        items: sortBanknotesByCurrencyAndValue(items, currencyDefs)
      });
    }
  }
  // Any banknotes whose currency isn't in currencyDefs (fallback group)
  const otherItems = banknotes.filter(
    note =>
      !currencyDefs.some(
        c => extractCurrency(note.denomination) === c.name.toLowerCase()
      )
  );
  if (otherItems.length > 0) {
    groups.push({
      currency: "Other",
      currencyDisplay: "Other",
      currencyDisplayOrder: 999,
      items: otherItems
    });
  }
  return groups;
}
