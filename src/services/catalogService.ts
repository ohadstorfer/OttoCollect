import { DetailedBanknote } from "@/types";
import { db } from "@/lib/db";

const ITEMS_PER_PAGE = 12;

export const fetchBanknotes = async (
  countryId: string,
  currentPage: number = 1,
  search?: string,
  categories?: string[],
  types?: string[],
  sort?: string[]
) => {
  try {
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;

    let whereClause = {
      country_id: countryId,
      is_approved: true,
    } as any;

    if (search) {
      whereClause.OR = [
        { denomination: { contains: search, mode: "insensitive" } },
        { year: { contains: search, mode: "insensitive" } },
        { series: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { extended_pick_number: { contains: search, mode: "insensitive" } },
        { type: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ];
    }

    if (categories && categories.length > 0) {
      whereClause.category = {
        in: categories,
      };
    }

    if (types && types.length > 0) {
      whereClause.type = {
        in: types,
      };
    }

    const [banknotes, totalCount] = await Promise.all([
      db.banknote.findMany({
        where: whereClause,
        orderBy: sort && sort.length > 0 ? sort.map((sortKey) => {
          if (sortKey === 'year') {
            return { year: 'asc' };
          } else if (sortKey === 'denomination') {
            return { denomination: 'asc' };
          } else if (sortKey === 'sultan') {
            return { sultan_name: 'asc' };
          } else {
            return { extended_pick_number: 'asc' };
          }
        }) : { extended_pick_number: 'asc' },
        skip: offset,
        take: ITEMS_PER_PAGE,
      }),
      db.banknote.count({
        where: whereClause,
      }),
    ]);

    const pageCount = Math.ceil(totalCount / ITEMS_PER_PAGE);

    return {
      data: banknotes,
      pageCount,
      totalCount,
    };
  } catch (error) {
    console.error("Error fetching banknotes:", error);
    return {
      data: [],
      pageCount: 0,
      totalCount: 0,
    };
  }
};

export const fetchBanknoteDetailsById = async (banknoteId: string): Promise<DetailedBanknote | null> => {
  try {
    const banknote = await db.banknote.findUnique({
      where: {
        id: banknoteId,
      },
    });

    if (!banknote) {
      return null;
    }

    // Convert the database object to the desired DetailedBanknote format
    const detailedBanknote: DetailedBanknote = {
      id: banknote.id,
      catalogId: banknote.catalog_id,
      country: banknote.country_id,
      denomination: banknote.denomination,
      year: banknote.year,
      series: banknote.series || undefined,
      description: banknote.description || undefined,
      obverseDescription: banknote.obverse_description || undefined,
      reverseDescription: banknote.reverse_description || undefined,
      imageUrls: [banknote.front_picture, banknote.back_picture].filter(Boolean),
      isApproved: banknote.is_approved,
      isPending: banknote.is_pending,
      createdAt: banknote.created_at.toISOString(),
      updatedAt: banknote.updated_at.toISOString(),
      pickNumber: banknote.pick_number || undefined,
      turkCatalogNumber: banknote.turk_catalog_number || undefined,
      sultanName: banknote.sultan_name || undefined,
      sealNames: banknote.seal_names || undefined,
      rarity: banknote.rarity || undefined,
      printer: banknote.printer || undefined,
      type: banknote.type || undefined,
      category: banknote.category || undefined,
      securityFeatures: banknote.security_features ? JSON.parse(banknote.security_features) : undefined,
      watermark: banknote.watermark || undefined,
      signatures: banknote.signatures ? JSON.parse(banknote.signatures) : undefined,
      colors: banknote.colors ? JSON.parse(banknote.colors) : undefined,
      gradeCounts: banknote.grade_counts ? JSON.parse(banknote.grade_counts) : undefined,
      averagePrice: banknote.average_price || undefined,
      islamicYear: banknote.islamic_year || undefined,
      gregorianYear: banknote.gregorian_year || undefined,
      banknoteDescription: banknote.banknote_description || undefined,
      historicalDescription: banknote.historical_description || undefined,
      serialNumbering: banknote.serial_numbering || undefined,
      securityElement: banknote.security_element || undefined,
      signaturesFront: banknote.signatures_front || undefined,
      signaturesBack: banknote.signatures_back || undefined,
      extendedPickNumber: banknote.extended_pick_number || undefined,
    };

    return detailedBanknote;
  } catch (error) {
    console.error("Error fetching banknote details:", error);
    return null;
  }
};
