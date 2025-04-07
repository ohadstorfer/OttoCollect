
import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { User, UserRole } from '@/types';
import { Search, Loader2, UserCheck } from 'lucide-react';

interface UserManagementProps {
  isSuperAdmin: boolean;
}

const UserManagement = ({ isSuperAdmin }: UserManagementProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingUsers, setUpdatingUsers] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  useEffect(() => {
    fetchUsers();
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
        rank: profile.rank,
        points: profile.points,
        createdAt: profile.created_at,
        avatarUrl: profile.avatar_url,
        country: profile.country,
        about: profile.about,
      }));

      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    setUpdatingUsers(prev => ({ ...prev, [userId]: true }));
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      // Update local state
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );

      toast.success(`User role updated successfully`);
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    } finally {
      setUpdatingUsers(prev => ({ ...prev, [userId]: false }));
    }
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
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {isSuperAdmin ? (
                        <div className="flex items-center">
                          <Select
                            value={user.role}
                            onValueChange={(value) => updateUserRole(user.id, value as UserRole)}
                            disabled={updatingUsers[user.id]}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="User">User</SelectItem>
                              <SelectItem value="Admin">Admin</SelectItem>
                              <SelectItem value="Super Admin">Super Admin</SelectItem>
                            </SelectContent>
                          </Select>

                          {updatingUsers[user.id] && (
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
