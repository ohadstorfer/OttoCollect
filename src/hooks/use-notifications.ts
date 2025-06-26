
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Notification } from '@/types/notification';
import { 
  getNotifications, 
  getUnreadNotificationsCount, 
  markNotificationsAsRead, 
  subscribeToNotifications 
} from '@/services/notificationService';

export const useNotifications = (userId?: string) => {
  const queryClient = useQueryClient();

  const {
    data: notifications = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => getNotifications(userId!),
    enabled: !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const {
    data: unreadCount = 0,
    refetch: refetchUnreadCount
  } = useQuery({
    queryKey: ['unreadNotifications', userId],
    queryFn: () => getUnreadNotificationsCount(userId!),
    enabled: !!userId,
    refetchInterval: 15000, // Refetch every 15 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: ({ notificationIds }: { notificationIds?: string[] }) =>
      markNotificationsAsRead(userId!, notificationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotifications', userId] });
    }
  });

  const markAsRead = useCallback((notificationIds?: string[]) => {
    markAsReadMutation.mutate({ notificationIds });
  }, [markAsReadMutation]);

  const markAllAsRead = useCallback(() => {
    markAsReadMutation.mutate({ notificationIds: undefined });
  }, [markAsReadMutation]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToNotifications(userId, (newNotification) => {
      queryClient.setQueryData(['notifications', userId], (old: Notification[] = []) => [
        newNotification,
        ...old
      ]);
      refetchUnreadCount();
    });

    return unsubscribe;
  }, [userId, queryClient, refetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refetch,
    isMarkingAsRead: markAsReadMutation.isPending
  };
};
