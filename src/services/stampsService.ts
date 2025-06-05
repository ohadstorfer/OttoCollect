
import { supabase } from '@/integrations/supabase/client';
import { StampPicture, StampUploadData, StampType } from '@/types/stamps';

const TABLE_NAMES = {
  signature: 'signature_pictures',
  seal: 'seal_pictures', 
  watermark: 'watermark_pictures'
} as const;

export async function fetchStampPictures(type: StampType, countryId?: string): Promise<StampPicture[]> {
  try {
    let query = supabase
      .from(TABLE_NAMES[type])
      .select('*')
      .order('created_at', { ascending: false });

    if (countryId) {
      query = query.eq('country_id', countryId);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Error fetching ${type} pictures:`, error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error(`Error in fetchStampPictures for ${type}:`, error);
    return [];
  }
}

export async function createStampPicture(type: StampType, data: StampUploadData): Promise<StampPicture> {
  try {
    const { data: result, error } = await supabase
      .from(TABLE_NAMES[type])
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error(`Error creating ${type} picture:`, error);
      throw error;
    }

    return result;
  } catch (error) {
    console.error(`Error in createStampPicture for ${type}:`, error);
    throw error;
  }
}

export async function updateStampPicture(type: StampType, id: string, data: Partial<StampUploadData>): Promise<StampPicture> {
  try {
    const { data: result, error } = await supabase
      .from(TABLE_NAMES[type])
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating ${type} picture:`, error);
      throw error;
    }

    return result;
  } catch (error) {
    console.error(`Error in updateStampPicture for ${type}:`, error);
    throw error;
  }
}

export async function deleteStampPicture(type: StampType, id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from(TABLE_NAMES[type])
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting ${type} picture:`, error);
      throw error;
    }
  } catch (error) {
    console.error(`Error in deleteStampPicture for ${type}:`, error);
    throw error;
  }
}

export async function uploadStampImage(file: File): Promise<string> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `stamps/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('banknote_images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('banknote_images')
      .getPublicUrl(data.path);
      
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading stamp image:', error);
    throw new Error('Failed to upload image');
  }
}
