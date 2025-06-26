
import { generateCollectionActivityNotifications } from '@/services/notificationService';

// This function can be called manually or via a scheduled job
export const runDailyNotificationGeneration = async () => {
  try {
    console.log('Generating daily collection activity notifications...');
    await generateCollectionActivityNotifications();
    console.log('Daily notifications generated successfully');
  } catch (error) {
    console.error('Error generating daily notifications:', error);
  }
};

// For development/testing purposes - can be called manually
export const scheduleNotificationGeneration = () => {
  // In a real application, you might want to use a cron job or scheduled function
  // For now, this is a placeholder for manual testing
  console.log('Notification generation scheduled');
};
