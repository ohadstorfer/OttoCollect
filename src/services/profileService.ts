
// Fix user mapping in getUserProfile:
async function getUserProfile(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    
    if (!data) {
      console.log(`No profile found for user ID: ${userId}`);
      return null;
    }
    
    // Map database fields to our User type
    return {
      id: data.id,
      username: data.username,
      email: data.email,
      about: data.about || '',
      country: data.country || '',
      role_id: data.role_id || '',
      role: data.role || 'User',
      rank: data.rank as UserRank, 
      points: data.points,
      createdAt: data.created_at,
      avatarUrl: data.avatar_url,
    };
  } catch (error) {
    console.error('Unexpected error in getUserProfile:', error);
    return null;
  }
}
