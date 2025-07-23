import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ProfileEditForm } from '@/components/profile/ProfileEditForm';
import { useTheme } from '@/context/ThemeContext';
import ChangePassword from '@/components/auth/ChangePassword';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(true);
  const { theme } = useTheme();

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
    <div >

      <section className={`${theme === 'light' ? 'bg-ottoman-100' : 'bg-dark-600'} py-12 relative overflow-hidden mb-10`}>
        <div className="absolute inset-0 -z-10">
          <div
            className={`absolute inset-y-0 right-1/2 -z-10 mr-16 w-[200%] origin-bottom-left skew-x-[-30deg] ${theme === 'light'
                ? 'bg-ottoman-500/10 shadow-ottoman-300/20 ring-ottoman-400/10'
                : 'bg-dark-500/40 shadow-ottoman-900/20 ring-ottoman-900/10'
              } shadow-xl ring-1 ring-inset`}
            aria-hidden="true"
          />
        </div>

        <div className="container mx-auto px-4 relative z-10 flex items-center justify-center">
          <h1
            className={`text-3xl md:text-4xl font-serif font-bold text-center ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'
              } fade-bottom`}
          >
            <span>Settings</span>
          </h1>
        </div>

        <p
          className={`mt-4 text-center ${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-300'
            } max-w-2xl mx-auto fade-bottom`}
        >
          Manage your preferences, privacy, and account details.
        </p>
      </section>

      <div className="max-w-4xl mx-auto">
        <ProfileEditForm
          profile={user}
          onCancel={() => {}} // Empty function since ProfileEditForm handles navigation internally
          onSaveComplete={handleSaveComplete}
        />
        {/* <ChangePassword /> */}
      </div>
    </div>
  );
};

export default Settings;
