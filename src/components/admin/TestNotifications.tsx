import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { fetchUserCollection } from '@/services/collectionService';
import { getFollowing } from '@/services/followService';
import { toast } from 'sonner';
import { Bell, Loader2 } from 'lucide-react';

const TestNotifications = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const sendTestNotifications = async () => {
    console.log('sendTestNotifications called, user:', user);
    if (!user) {
      console.log('No user found, aborting');
      toast.error('Not authenticated');
      return;
    }
    setLoading(true);

    try {
      // 1. Get a followed user
      const following = await getFollowing(user.id);
      const followedUser = following[0]?.following_profile;
      const activeUsername = followedUser?.username || 'TestUser';
      const activeUserId = followedUser?.id || user.id;

      // 2. Get followed user's collection items (fall back to own collection)
      let collectionItems = await fetchUserCollection(activeUserId);
      if (collectionItems.length === 0) {
        collectionItems = await fetchUserCollection(user.id);
      }

      // 3. Build item data from real collection
      const itemsWithDetails = collectionItems
        .filter(item => item.banknote)
        .map(item => ({
          collection_item_id: item.id,
          extended_pick_number: item.banknote?.extendedPickNumber || 'Unknown',
          country: item.banknote?.country || 'Unknown',
          is_unlisted: item.is_unlisted_banknote || false,
        }));

      // Group items by country
      const byCountry: Record<string, typeof itemsWithDetails> = {};
      for (const item of itemsWithDetails) {
        if (!byCountry[item.country]) byCountry[item.country] = [];
        byCountry[item.country].push(item);
      }
      const countries = Object.keys(byCountry);

      const notifications: any[] = [];

      // --- Collection Activity: ≤10 items, single country ---
      const singleCountry = countries[0];
      const singleCountryItems = (byCountry[singleCountry] || []).slice(0, Math.min(byCountry[singleCountry]?.length || 0, 5));
      if (singleCountryItems.length > 0) {
        const pickNumbers = singleCountryItems.map(i => i.extended_pick_number).join(', ');
        notifications.push({
          user_id: user.id,
          type: 'collection_activity',
          title: 'New Collection Items',
          title_ar: 'عناصر جديدة في المجموعة',
          title_tr: 'Yeni Koleksiyon Öğeleri',
          content: `${activeUsername} added ${pickNumbers} to their ${singleCountry} collection`,
          content_ar: `${activeUsername} أضاف ${pickNumbers} إلى مجموعة ${singleCountry}`,
          content_tr: `${activeUsername} ${singleCountry} koleksiyonuna ${pickNumbers} ekledi`,
          reference_id: activeUserId,
          reference_data: {
            active_user_id: activeUserId,
            active_username: activeUsername,
            items_added: singleCountryItems.length,
            items_updated: 0,
            activity_date: new Date().toISOString().split('T')[0],
            country: singleCountry,
            items: singleCountryItems,
          },
        });
      }

      // --- Collection Activity: ≤5 items, multiple countries ---
      if (countries.length >= 2) {
        const multiCountryItems = [
          ...byCountry[countries[0]].slice(0, 2),
          ...byCountry[countries[1]].slice(0, 2),
        ].slice(0, 4);
        const pickNumbers = multiCountryItems.map(i => i.extended_pick_number).join(', ');
        const multiCountryNames = [countries[0], countries[1]].join(' & ');
        notifications.push({
          user_id: user.id,
          type: 'collection_activity',
          title: 'New Collection Items',
          title_ar: 'عناصر جديدة في المجموعة',
          title_tr: 'Yeni Koleksiyon Öğeleri',
          content: `${activeUsername} added ${pickNumbers} to their ${multiCountryNames} collections`,
          content_ar: `${activeUsername} أضاف ${pickNumbers} إلى مجموعات ${multiCountryNames}`,
          content_tr: `${activeUsername} ${multiCountryNames} koleksiyonlarına ${pickNumbers} ekledi`,
          reference_id: activeUserId,
          reference_data: {
            active_user_id: activeUserId,
            active_username: activeUsername,
            items_added: multiCountryItems.length,
            items_updated: 0,
            activity_date: new Date().toISOString().split('T')[0],
            items: multiCountryItems,
          },
        });
      }

      // --- Collection Activity: >10 items (shows 10 chips + "and X more...") ---
      if (singleCountry && byCountry[singleCountry].length >= 3) {
        const allItems = byCountry[singleCountry];
        const first10 = allItems.slice(0, 10);
        const totalFake = Math.max(allItems.length, 15); // simulate 15 to show "and X more..."
        const pickNumbers = first10.map(i => i.extended_pick_number).join(', ');
        const remaining = totalFake - first10.length;
        notifications.push({
          user_id: user.id,
          type: 'collection_activity',
          title: 'New Collection Items',
          title_ar: 'عناصر جديدة في المجموعة',
          title_tr: 'Yeni Koleksiyon Öğeleri',
          content: `${activeUsername} added ${pickNumbers} and ${remaining} more to their ${singleCountry} collection`,
          content_ar: `${activeUsername} أضاف ${pickNumbers} و ${remaining} أخرى إلى مجموعة ${singleCountry}`,
          content_tr: `${activeUsername} ${singleCountry} koleksiyonuna ${pickNumbers} ve ${remaining} tane daha ekledi`,
          reference_id: activeUserId,
          reference_data: {
            active_user_id: activeUserId,
            active_username: activeUsername,
            items_added: totalFake,
            items_updated: 0,
            activity_date: new Date().toISOString().split('T')[0],
            country: singleCountry,
            items: first10,
          },
        });
      }

      // --- Image Upload: ≤10 items ---
      if (singleCountryItems.length > 0) {
        const imageItems = singleCountryItems.slice(0, 3);
        const pickNumbers = imageItems.map(i => i.extended_pick_number).join(', ');
        notifications.push({
          user_id: user.id,
          type: 'collection_image_upload',
          title: 'New Collection Images',
          title_ar: 'صور جديدة في المجموعة',
          title_tr: 'Yeni Koleksiyon Görselleri',
          content: `${activeUsername} uploaded images for ${pickNumbers} in their ${singleCountry} collection`,
          content_ar: `${activeUsername} رفع صوراً لـ ${pickNumbers} في مجموعة ${singleCountry}`,
          content_tr: `${activeUsername} ${singleCountry} koleksiyonundaki ${pickNumbers} için görsel yükledi`,
          reference_id: activeUserId,
          reference_data: {
            active_user_id: activeUserId,
            active_username: activeUsername,
            items_added: imageItems.length,
            activity_date: new Date().toISOString().split('T')[0],
            country: singleCountry,
            items: imageItems,
          },
        });
      }

      // --- Image Upload: >10 items (shows chips + "and X more...") ---
      if (singleCountry && byCountry[singleCountry].length >= 3) {
        const allImgItems = byCountry[singleCountry];
        const first10Img = allImgItems.slice(0, 10);
        const totalFakeImg = Math.max(allImgItems.length, 14);
        const pickNumbersImg = first10Img.map(i => i.extended_pick_number).join(', ');
        const remainingImg = totalFakeImg - first10Img.length;
        notifications.push({
          user_id: user.id,
          type: 'collection_image_upload',
          title: 'New Collection Images',
          title_ar: 'صور جديدة في المجموعة',
          title_tr: 'Yeni Koleksiyon Görselleri',
          content: `${activeUsername} uploaded images for ${pickNumbersImg} and ${remainingImg} more in their ${singleCountry} collection`,
          content_ar: `${activeUsername} رفع صوراً لـ ${pickNumbersImg} و ${remainingImg} أخرى في مجموعة ${singleCountry}`,
          content_tr: `${activeUsername} ${singleCountry} koleksiyonundaki ${pickNumbersImg} ve ${remainingImg} tane daha için görsel yükledi`,
          reference_id: activeUserId,
          reference_data: {
            active_user_id: activeUserId,
            active_username: activeUsername,
            items_added: totalFakeImg,
            activity_date: new Date().toISOString().split('T')[0],
            country: singleCountry,
            items: first10Img,
          },
        });
      }

      // --- Follow notification ---
      notifications.push({
        user_id: user.id,
        type: 'follow',
        title: 'New Follower',
        title_ar: 'متابع جديد',
        title_tr: 'Yeni Takipçi',
        content: `${activeUsername} started following you`,
        content_ar: `${activeUsername} بدأ بمتابعتك`,
        content_tr: `${activeUsername} seni takip etmeye başladı`,
        reference_id: activeUserId,
        reference_data: {
          follower_id: activeUserId,
          follower_username: activeUsername,
        },
      });

      // --- Message notification ---
      notifications.push({
        user_id: user.id,
        type: 'message',
        title: 'New Message',
        title_ar: 'رسالة جديدة',
        title_tr: 'Yeni Mesaj',
        content: `You have a new message from ${activeUsername}`,
        content_ar: `لديك رسالة جديدة من ${activeUsername}`,
        content_tr: `${activeUsername} tarafından yeni bir mesajınız var`,
        reference_id: null,
        reference_data: {
          sender_id: activeUserId,
          sender_username: activeUsername,
        },
      });

      // --- Badge earned notification ---
      notifications.push({
        user_id: user.id,
        type: 'badge_earned',
        title: 'Badge Earned!',
        title_ar: 'تم الحصول على شارة!',
        title_tr: 'Rozet Kazanıldı!',
        content: 'You earned the Collector badge - Stage 1',
        content_ar: 'حصلت على شارة الجامع - المرحلة 1',
        content_tr: 'Koleksiyoncu rozetini kazandınız - Aşama 1',
        reference_id: null,
        reference_data: {
          badge_id: null,
          badge_name: 'Collector',
          badge_stage: 'Stage 1',
          recipient_username: user.username,
        },
      });

      // --- Badge achievement notification ---
      notifications.push({
        user_id: user.id,
        type: 'badge_achievement',
        title: 'Badge Achievement',
        title_ar: 'إنجاز شارة',
        title_tr: 'Rozet Başarısı',
        content: `${activeUsername} earned the Contributor badge - Stage 2`,
        content_ar: `${activeUsername} حصل على شارة المساهم - المرحلة 2`,
        content_tr: `${activeUsername} Katkıda Bulunan rozetini kazandı - Aşama 2`,
        reference_id: null,
        reference_data: {
          badge_id: null,
          badge_name: 'Contributor',
          badge_stage: 'Stage 2',
          recipient_username: activeUsername,
        },
      });

      // --- Forum post notification ---
      notifications.push({
        user_id: user.id,
        type: 'forum_post',
        title: 'New Forum Post',
        title_ar: 'منشور جديد في المنتدى',
        title_tr: 'Yeni Forum Gönderisi',
        content: `${activeUsername} posted in the forum`,
        content_ar: `${activeUsername} نشر في المنتدى`,
        content_tr: `${activeUsername} forumda paylaşım yaptı`,
        reference_id: null,
        reference_data: {
          author_username: activeUsername,
        },
      });

      // --- Blog post notification ---
      notifications.push({
        user_id: user.id,
        type: 'blog_post',
        title: 'New Blog Post',
        title_ar: 'مقالة جديدة',
        title_tr: 'Yeni Blog Yazısı',
        content: 'A new blog post has been published',
        content_ar: 'تم نشر مقالة جديدة',
        content_tr: 'Yeni bir blog yazısı yayınlandı',
        reference_id: null,
        reference_data: {},
      });

      // Insert all notifications
      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;

      toast.success(`${notifications.length} test notifications created! Check your notification bell.`);
    } catch (error) {
      console.error('Error creating test notifications:', error);
      toast.error('Failed to create test notifications');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-serif">Test Notifications</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Generate test notifications of all types using real collection data from users you follow.
          This creates notifications for: collection activity (≤5 single country, ≤5 multi-country,
          &gt;5 single country, &gt;5 multi-country), follow, message, badge earned, badge achievement,
          forum post, and blog post.
        </p>
        <Button onClick={sendTestNotifications} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Bell className="mr-2 h-4 w-4" />
          )}
          Send Test Notifications
        </Button>
      </CardContent>
    </Card>
  );
};

export default TestNotifications;
