import { supabase } from '@/integrations/supabase/client';
import { User, UserRole, UserRank } from '@/types';

export async function getSuperAdmins(): Promise<User[]> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "Super Admin");

    if (error) {
      console.error("Error fetching super admins:", error);
      return [];
    }

    return data.map(profile => ({
      id: profile.id,
      username: profile.username,
      email: profile.email,
      role: profile.role as UserRole,
      role_id: profile.role_id || "",
      rank: profile.rank as UserRank,
      points: profile.points,
      createdAt: profile.created_at,
      avatarUrl: profile.avatar_url || '/placeholder-brown.svg',
      ...(profile.country && { country: profile.country }),
      ...(profile.about && { about: profile.about }),
      ...(profile.facebook_url && { facebook_url: profile.facebook_url }),
      ...(profile.instagram_url && { instagram_url: profile.instagram_url }),
      ...(profile.twitter_url && { twitter_url: profile.twitter_url }),
      ...(profile.linkedin_url && { linkedin_url: profile.linkedin_url }),
    }));
  } catch (error) {
    console.error("Error in getSuperAdmins:", error);
    return [];
  }
}

export async function updateCategoryDefinition(
  categoryId: string,
  newName: string,
  oldName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('=== UPDATE CATEGORY START ===');
    console.log(`Updating category: ID=${categoryId}`);
    console.log(`Old name: "${oldName}" -> New name: "${newName}"`);

    // First check if there are any banknotes with this category
    const { data: existingBanknotes, error: checkError } = await supabase
      .from('detailed_banknotes')
      .select('id, category')
      .eq('category', oldName);

    if (checkError) {
      console.error('Error checking existing banknotes:', checkError);
      throw checkError;
    }

    console.log(`Found ${existingBanknotes?.length || 0} banknotes with category "${oldName}"`);

    // Update the category definition
    const { data: updatedDefinition, error: definitionError } = await supabase
      .from('banknote_category_definitions')
      .update({ name: newName })
      .eq('id', categoryId)
      .select()
      .single();

    if (definitionError) {
      console.error('Error updating category definition:', definitionError);
      throw definitionError;
    }

    console.log('Category definition updated:', updatedDefinition);

    // Update banknotes
    if (existingBanknotes && existingBanknotes.length > 0) {
      const { data: updated, error: updateError } = await supabase
        .from('detailed_banknotes')
        .update({ category: newName })
        .eq('category', oldName)
        .select('id, category');

      if (updateError) {
        console.error('Error updating banknotes:', updateError);
        throw updateError;
      }

      console.log('Updated banknotes:', updated);
      console.log(`Successfully updated ${updated?.length || 0} banknotes`);
    }

    console.log('=== UPDATE CATEGORY COMPLETE ===');
    return { success: true };
  } catch (error) {
    console.error('=== UPDATE CATEGORY FAILED ===');
    console.error('Error details:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

export async function updateTypeDefinition(
  typeId: string,
  newName: string,
  oldName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('=== UPDATE TYPE START ===');
    console.log(`Updating type: ID=${typeId}`);
    console.log(`Old name: "${oldName}" -> New name: "${newName}"`);

    // First check if there are any banknotes with this type
    const { data: existingBanknotes, error: checkError } = await supabase
      .from('detailed_banknotes')
      .select('id, type')
      .eq('type', oldName);

    if (checkError) {
      console.error('Error checking existing banknotes:', checkError);
      throw checkError;
    }

    console.log(`Found ${existingBanknotes?.length || 0} banknotes with type "${oldName}"`);

    // Update the type definition
    const { data: updatedDefinition, error: definitionError } = await supabase
      .from('banknote_type_definitions')
      .update({ name: newName })
      .eq('id', typeId)
      .select()
      .single();

    if (definitionError) {
      console.error('Error updating type definition:', definitionError);
      throw definitionError;
    }

    console.log('Type definition updated:', updatedDefinition);

    // Update banknotes
    if (existingBanknotes && existingBanknotes.length > 0) {
      const { data: updated, error: updateError } = await supabase
        .from('detailed_banknotes')
        .update({ type: newName })
        .eq('type', oldName)
        .select('id, type');

      if (updateError) {
        console.error('Error updating banknotes:', updateError);
        throw updateError;
      }

      console.log('Updated banknotes:', updated);
      console.log(`Successfully updated ${updated?.length || 0} banknotes`);
    }

    console.log('=== UPDATE TYPE COMPLETE ===');
    return { success: true };
  } catch (error) {
    console.error('=== UPDATE TYPE FAILED ===');
    console.error('Error details:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

export async function updateSortOption(
  sortOptionId: string,
  newName: string,
  fieldName: string,
  description: string = '',
  isDefault: boolean = false,
  isRequired: boolean = false,
  displayOrder: number = 0
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('=== UPDATE SORT OPTION START ===');
    console.log(`Updating sort option: ID=${sortOptionId}`);
    console.log(`New name: "${newName}", Field name: "${fieldName}"`);

    const { data, error } = await supabase
      .from('banknote_sort_options')
      .update({ 
        name: newName,
        field_name: fieldName,
        description: description,
        is_default: isDefault,
        is_required: isRequired,
        display_order: displayOrder
      })
      .eq('id', sortOptionId)
      .select();

    if (error) {
      console.error('Error updating sort option:', error);
      throw error;
    }

    console.log('Sort option updated:', data);
    console.log('=== UPDATE SORT OPTION COMPLETE ===');
    return { success: true };
  } catch (error) {
    console.error('=== UPDATE SORT OPTION FAILED ===');
    console.error('Error details:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
} 