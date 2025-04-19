
import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { User, Role } from '@/types';
import { Search, Loader2 } from 'lucide-react';

interface UserManagementProps {
  isSuperAdmin: boolean;
}

const UserManagement = ({ isSuperAdmin }: UserManagementProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          roles (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedUsers: User[] = data.map(profile => ({
        id: profile.id,
        username: profile.username,
        email: profile.email,
        role: profile.roles?.name || 'User',
        role_id: profile.role_id || '',
        rank: profile.rank as any,
        points: profile.points,
        createdAt: profile.created_at,
        avatarUrl: profile.avatar_url,
        country: profile.country,
        about: profile.about,
      }));
      
      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setRoles(data);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Failed to load roles');
    }
  };

  const updateUserRole = async (userId: string, roleId: string) => {
    try {
      console.log(`Updating user ${userId} to role ${roleId}`);
      
      // Update the user's role_id in the database
      const { error } = await supabase
        .from('profiles')
        .update({ role_id: roleId })
        .eq('id', userId);

      if (error) {
        console.error('Error details:', error);
        throw error;
      }

      // Get the name of the selected role
      const selectedRole = roles.find(r => r.id === roleId);
      
      if (!selectedRole) {
        throw new Error('Selected role not found');
      }
      
      toast.success(`User role updated to ${selectedRole.name}`);
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId 
          ? { 
              ...user, 
              role_id: roleId, 
              role: selectedRole.name 
            } 
          : user
      ));
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  const getRoleDisplay = (user: User) => {
    const role = roles.find(r => r.id === user.role_id);
    return role?.name || user.role || 'Unknown Role';
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
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {getRoleDisplay(user)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {isSuperAdmin && (
                    <Select
                      value={user.role_id || undefined}
                      onValueChange={(value) => updateUserRole(user.id, value)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default UserManagement;
