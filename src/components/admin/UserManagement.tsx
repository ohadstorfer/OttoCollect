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
import { useTranslation } from 'react-i18next';
import { blockUserByEmail, deleteUserById } from '@/services/profileService';
import UserProfileDialog from './UserProfileDialog';

interface UserManagementProps {
  isSuperAdmin: boolean;
}

const UserManagement = ({ isSuperAdmin }: UserManagementProps) => {
  const { t } = useTranslation(['admin']);
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
  const [showForumBlockDialog, setShowForumBlockDialog] = useState(false);
  const [userToForumBlock, setUserToForumBlock] = useState<User | null>(null);
  const [forumBlockingUserId, setForumBlockingUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);

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
        is_forum_blocked: profile.is_forum_blocked || false,
      }));
      
      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(t('userManagement.errors.loadUsersFailed'));
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
      toast.error(t('userManagement.errors.loadRolesFailed'));
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
  
      // Check if role is a country admin
      const isCountryAdmin = (roleName: string) => {
        return roleName.toLowerCase().includes('admin') && !roleName.toLowerCase().includes('super');
      };
  
      const { error } = await supabase
        .from('profiles')
        .update({ 
          role_id: roleId,
          role: selectedRole.name,
        })
        .eq('id', userId);
  
      if (error) {
        console.error('Error details:', error);
        throw error;
      }
      
      toast.success(t('userManagement.success.roleUpdated', { role: selectedRole.name }));
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId 
          ? { 
              ...user, 
              role_id: roleId, 
              role: selectedRole.name,
              is_country_admin: isCountryAdmin(selectedRole.name) // ✅ reflect in state too
            } 
          : user
      ));
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error(t('userManagement.errors.updateRoleFailed'));
    }
  };

  



  const getRoleDisplay = (user: User) => {
    const role = roles.find(r => r.id === user.role_id);
    return role?.name || user.role || t('userManagement.unknownRole');
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

      toast.success(t('userManagement.success.userBlocked'));
      await fetchUsers();
    } catch (error) {
      console.error('Error blocking user:', error);
      toast.error(t('userManagement.errors.blockUserFailed'));
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

      toast.success(t('userManagement.success.userUnblocked'));
      await fetchUsers();
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast.error(t('userManagement.errors.unblockUserFailed'));
    } finally {
      setUnblockingUserId(null);
      setShowUnblockDialog(false);
      setUserToUnblock(null);
    }
  };

  const handleForumBlockToggle = (user: User) => {
    setUserToForumBlock(user);
    setShowForumBlockDialog(true);
  };

  const confirmForumBlockToggle = async () => {
    if (!userToForumBlock) return;
    setForumBlockingUserId(userToForumBlock.id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_forum_blocked: !userToForumBlock.is_forum_blocked
        })
        .eq('id', userToForumBlock.id);

      if (error) throw error;

      toast.success(userToForumBlock.is_forum_blocked ? t('userManagement.success.forumUnblocked') : t('userManagement.success.forumBlocked'));
      await fetchUsers();
    } catch (error) {
      console.error('Error toggling forum block:', error);
      toast.error(t('userManagement.errors.forumAccessFailed'));
    } finally {
      setForumBlockingUserId(null);
      setShowForumBlockDialog(false);
      setUserToForumBlock(null);
    }
  };

  const isCountryAdmin = (userRole: string) => {
    return userRole.toLowerCase().includes('admin') && !userRole.toLowerCase().includes('super');
  };

  const getUserCountry = (userRole: string) => {
    if (!isCountryAdmin(userRole)) return null;
    return userRole.toLowerCase().replace(' admin', '').trim();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('userManagement.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button onClick={fetchUsers} variant="outline" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('userManagement.loading')}
            </>
          ) : (
            t('userManagement.refreshUsers')
          )}
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('userManagement.table.username')}</TableHead>
              <TableHead>{t('userManagement.table.email')}</TableHead>
              <TableHead>{t('userManagement.table.role')}</TableHead>
              <TableHead>{t('userManagement.table.status')}</TableHead>
              <TableHead>{t('userManagement.table.forum')}</TableHead>
              <TableHead>{t('userManagement.table.createdAt')}</TableHead>
              <TableHead>{t('userManagement.table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  <Button
                    variant="outline"
                    className=" h-auto font-medium"
                    onClick={() => {
                      setSelectedUser(user);
                      setIsProfileDialogOpen(true);
                    }}
                  >
                    {user.username}
                  </Button>
                </TableCell>
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
                    {user.blocked ? t('userManagement.status.blocked') : t('userManagement.status.active')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={user.is_forum_blocked ? "destructive" : "default"}
                    className={`cursor-pointer hover:opacity-80 ${user.is_forum_blocked ? "bg-red-100 text-red-800 border-red-300" : "bg-green-100 text-green-800 border-green-300"}`}
                    onClick={() => handleForumBlockToggle(user)}
                  >
                    {user.is_forum_blocked ? t('userManagement.status.blocked') : t('userManagement.status.active')}
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
                          <SelectValue placeholder={t('userManagement.selectRole')} />
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
            <h2 className="text-lg font-bold mb-2"><span>{t('userManagement.dialogs.blockUser.title')}</span></h2>
            <p className="mb-4">{t('userManagement.dialogs.blockUser.description')}</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRemoveDialog(false)} disabled={removingUserId === userToRemove.id}>{t('common:cancel')}</Button>
              <Button variant="destructive" onClick={confirmRemoveAndBlock} disabled={removingUserId === userToRemove.id}>
                {removingUserId === userToRemove.id ? t('userManagement.dialogs.blockUser.blocking') : t('userManagement.dialogs.blockUser.block')}
              </Button>
            </div>
          </div>
        </div>
      )}
      {showUnblockDialog && userToUnblock && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-bold mb-2"><span>{t('userManagement.dialogs.unblockUser.title')}</span></h2>
            <p className="mb-4">{t('userManagement.dialogs.unblockUser.description')}</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowUnblockDialog(false)} disabled={unblockingUserId === userToUnblock.id}>{t('common:cancel')}</Button>
              <Button variant="default" onClick={confirmUnblock} disabled={unblockingUserId === userToUnblock.id}>
                {unblockingUserId === userToUnblock.id ? t('userManagement.dialogs.unblockUser.unblocking') : t('userManagement.dialogs.unblockUser.unblock')}
              </Button>
            </div>
          </div>
        </div>
      )}
      {showForumBlockDialog && userToForumBlock && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-bold mb-2">
              {userToForumBlock.is_forum_blocked ? t('userManagement.dialogs.forumBlock.unblockTitle') : t('userManagement.dialogs.forumBlock.blockTitle')}
            </h2>
            <p className="mb-4">
              {userToForumBlock.is_forum_blocked
                ? t('userManagement.dialogs.forumBlock.unblockDescription')
                : t('userManagement.dialogs.forumBlock.blockDescription')}
            </p>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowForumBlockDialog(false)} 
                disabled={forumBlockingUserId === userToForumBlock.id}
              >
                {t('common:cancel')}
              </Button>
              <Button 
                variant={userToForumBlock.is_forum_blocked ? "default" : "destructive"}
                onClick={confirmForumBlockToggle} 
                disabled={forumBlockingUserId === userToForumBlock.id}
              >
                {forumBlockingUserId === userToForumBlock.id 
                  ? (userToForumBlock.is_forum_blocked ? t('userManagement.dialogs.forumBlock.unblocking') : t('userManagement.dialogs.forumBlock.blocking')) 
                  : (userToForumBlock.is_forum_blocked ? t('userManagement.dialogs.forumBlock.unblock') : t('userManagement.dialogs.forumBlock.block'))}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* User Profile Dialog */}
      <UserProfileDialog
        user={selectedUser}
        open={isProfileDialogOpen}
        onOpenChange={setIsProfileDialogOpen}
      />
    </div>
  );
};

export default UserManagement;
