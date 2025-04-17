
// Update fetchBanknotes to use correct type mapping
export async function fetchBanknotes(filters?: BanknoteFilters): Promise<DetailedBanknote[]> {
  try {
    const query = supabase
      .from('detailed_banknotes')
      .select('*')
      .$filter(filters);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching banknotes:', error);
      return [];
    }

    return data.map(banknote => ({
      ...banknote,
      // Remove unsupported properties like faceValue
      gradeCounts: undefined,
      averagePrice: undefined
    }));
  } catch (error) {
    console.error('Unexpected error in fetchBanknotes:', error);
    return [];
  }
}
