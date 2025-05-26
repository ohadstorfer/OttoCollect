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
import { blockUserByEmail, deleteUserById } from '@/services/profileService';

interface UserManagementProps {
  isSuperAdmin: boolean;
}

const UserManagement = ({ isSuperAdmin }: UserManagementProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [userToRemove, setUserToRemove] = useState<User | null>(null);
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);
  const [userToUnblock, setUserToUnblock] = useState<User | null>(null);

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
        blocked: profile.blocked || false,
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
      
      // Get the name of the selected role first
      const selectedRole = roles.find(r => r.id === roleId);
      
      if (!selectedRole) {
        throw new Error('Selected role not found');
      }

      // Update both role_id and role in the database
      const { error } = await supabase
        .from('profiles')
        .update({ 
          role_id: roleId,
          role: selectedRole.name 
        })
        .eq('id', userId);

      if (error) {
        console.error('Error details:', error);
        throw error;
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

  const handleRemoveAndBlock = (user: User) => {
    setUserToRemove(user);
    setShowRemoveDialog(true);
  };

  const confirmRemoveAndBlock = async () => {
    if (!userToRemove) return;
    setRemovingUserId(userToRemove.id);
    try {
      // Block the user's email
      const blockSuccess = await blockUserByEmail(userToRemove.email);
      if (!blockSuccess) throw new Error('Failed to block user email');

      // Block user in profiles table instead of deleting
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          blocked: true,
          blocked_at: new Date().toISOString(),
          blocked_reason: "Blocked by Admin", // Optionally allow admin input for reasons
          blocked_by: /* Optionally, pass current admin ID here if available */
            null,
        })
        .eq('id', userToRemove.id);

      if (updateError) throw updateError;

      toast.success('User blocked and prevented from logging in.');
      await fetchUsers();
    } catch (error) {
      console.error('Error blocking user:', error);
      toast.error('Failed to remove and block user');
    } finally {
      setRemovingUserId(null);
      setShowRemoveDialog(false);
      setUserToRemove(null);
    }
  };

  const handleUnblock = (user: User) => {
    setUserToUnblock(user);
    setShowUnblockDialog(true);
  };

  const confirmUnblock = async () => {
    if (!userToUnblock) return;
    setUnblockingUserId(userToUnblock.id);
    try {
      // Unblock user in profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          blocked: false,
          blocked_at: null,
          blocked_reason: null,
          blocked_by: null,
        })
        .eq('id', userToUnblock.id);

      if (updateError) throw updateError;

      toast.success('User has been unblocked successfully.');
      await fetchUsers();
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast.error('Failed to unblock user');
    } finally {
      setUnblockingUserId(null);
      setShowUnblockDialog(false);
      setUserToUnblock(null);
    }
  };

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
              <TableHead>Status</TableHead>
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
                  <Badge 
                    variant={user.blocked ? "destructive" : "default"}
                    className={`cursor-pointer hover:opacity-80 ${user.blocked ? "bg-red-100 text-red-800 border-red-300" : "bg-green-100 text-green-800 border-green-300"}`}
                    onClick={() => user.blocked ? handleUnblock(user) : handleRemoveAndBlock(user)}
                  >
                    {user.blocked ? "Blocked" : "Active"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {isSuperAdmin && (
                    <div className="flex flex-col gap-2">
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
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {showRemoveDialog && userToRemove && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-bold mb-2">Block user</h2>
            <p className="mb-4">Are you sure that you want to block this user from the website and prevent them from opening another account with this email address in the future?</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRemoveDialog(false)} disabled={removingUserId === userToRemove.id}>Cancel</Button>
              <Button variant="destructive" onClick={confirmRemoveAndBlock} disabled={removingUserId === userToRemove.id}>
                {removingUserId === userToRemove.id ? 'Blocking...' : 'Block user'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {showUnblockDialog && userToUnblock && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-bold mb-2">Unblock user</h2>
            <p className="mb-4">Are you sure you want to unblock this user? They will be able to log in and access the website again.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowUnblockDialog(false)} disabled={unblockingUserId === userToUnblock.id}>Cancel</Button>
              <Button variant="default" onClick={confirmUnblock} disabled={unblockingUserId === userToUnblock.id}>
                {unblockingUserId === userToUnblock.id ? 'Unblocking...' : 'Unblock user'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
