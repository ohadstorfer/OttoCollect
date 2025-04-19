import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { User, UserRole, Country, CountryAdminAssignment } from '@/types';
import { Search, Loader2 } from 'lucide-react';

interface UserManagementProps {
  isSuperAdmin: boolean;
}

const UserManagement = ({ isSuperAdmin }: UserManagementProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [countryAdmins, setCountryAdmins] = useState<CountryAdminAssignment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchUsers();
    fetchCountries();
    fetchCountryAdmins();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const fetchedUsers = data.map(profile => ({
        id: profile.id,
        username: profile.username,
        email: profile.email,
        role: profile.role as UserRole,
        rank: profile.rank as any,
        points: profile.points,
        createdAt: profile.created_at,
        avatarUrl: profile.avatar_url,
        country: profile.country,
        about: profile.about,
      }));

      setUsers(fetchedUsers as User[]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchCountries = async () => {
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setCountries(data || []);
    } catch (error) {
      console.error('Error fetching countries:', error);
      toast.error('Failed to load countries');
    }
  };

  const fetchCountryAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('country_admins')
        .select('*');
      
      if (error) throw error;
      setCountryAdmins(data || []);
    } catch (error) {
      console.error('Error fetching country admins:', error);
      toast.error('Failed to load country admin assignments');
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole, countryId?: string) => {
    try {
      if (newRole === 'User' || newRole === 'Super Admin') {
        await supabase
          .from('country_admins')
          .delete()
          .eq('user_id', userId);
      }

      if (countryId) {
        await supabase
          .from('country_admins')
          .delete()
          .eq('user_id', userId);

        await supabase
          .from('country_admins')
          .insert([{ user_id: userId, country_id: countryId }]);
      }

      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      toast.success('User role updated successfully');
      fetchUsers();
      fetchCountryAdmins();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  const getUserRoleOptions = () => {
    const options = [
      <SelectItem key="user" value="User">User</SelectItem>,
      <SelectItem key="super-admin" value="Super Admin">Super Admin</SelectItem>
    ];

    countries.forEach(country => {
      options.push(
        <SelectItem 
          key={`country-admin-${country.id}`} 
          value={`country-admin-${country.id}`}
        >
          {country.name} Admin
        </SelectItem>
      );
    });

    return options;
  };

  const handleRoleChange = (userId: string, value: string) => {
    if (value.startsWith('country-admin-')) {
      const countryId = value.replace('country-admin-', '');
      updateUserRole('Admin', userId, countryId);
    } else {
      updateUserRole(value as UserRole, userId);
    }
  };

  const getCurrentRoleValue = (user: User) => {
    if (user.role === 'Super Admin' || user.role === 'User') {
      return user.role;
    }

    const countryAdmin = countryAdmins.find(ca => ca.user_id === user.id);
    return countryAdmin ? `country-admin-${countryAdmin.country_id}` : user.role;
  };

  const getRoleDisplay = (user: User) => {
    if (user.role === 'Super Admin' || user.role === 'User') {
      return user.role;
    }

    const countryAdmin = countryAdmins.find(ca => ca.user_id === user.id);
    if (countryAdmin) {
      const country = countries.find(c => c.id === countryAdmin.country_id);
      return country ? `${country.name} Admin` : 'Admin';
    }

    return user.role;
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button onClick={fetchUsers} variant="outline" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading
            </>
          ) : (
            'Refresh Users'
          )}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-ottoman-600" />
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge 
                        className={
                          user.role === 'Super Admin' ? 'bg-red-500 hover:bg-red-600' :
                          user.role === 'Admin' ? 'bg-amber-500 hover:bg-amber-600' :
                          'bg-blue-500 hover:bg-blue-600'
                        }
                      >
                        {getRoleDisplay(user)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {isSuperAdmin ? (
                        <div className="flex items-center">
                          <Select
                            value={getCurrentRoleValue(user)}
                            onValueChange={(value) => handleRoleChange(user.id, value)}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {getUserRoleOptions()}
                            </SelectContent>
                          </Select>

                          {loading && (
                            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {user.role === 'Super Admin' ? 'No actions available' : 'Limited permissions'}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
