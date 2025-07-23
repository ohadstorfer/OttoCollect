import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ProfileEditForm } from '@/components/profile/ProfileEditForm';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(true);

  const handleCancel = () => {
    // For settings page, we don't need to navigate away
    setIsEditing(false);
    setIsEditing(true); // Immediately set back to editing
  };

  const handleSaveComplete = () => {
    // Keep editing mode active in settings
    setIsEditing(true);
  };

  if (!user) {
    return (
      <div className="page-container py-10">
        <div className="max-w-4xl mx-auto">
          <p>Please log in to access settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container py-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>
        <ProfileEditForm
          profile={user}
          onCancel={handleCancel}
          onSaveComplete={handleSaveComplete}
        />
      </div>
    </div>
  );
};

export default Settings;
