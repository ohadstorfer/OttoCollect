import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ProfileEditForm } from '@/components/profile/ProfileEditForm';
import { useTheme } from '@/context/ThemeContext';
import ChangePassword from '@/components/auth/ChangePassword';
import { User, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

type SettingsTab = 'profile' | 'password';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(true);
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const { theme } = useTheme();
  const { t } = useTranslation(['settings']);

  const handleSaveComplete = () => {
    // Keep editing mode active in settings
    setIsEditing(true);
  };

  if (!user) {
    return (
      <div className="page-container py-10">
        <div className="max-w-4xl mx-auto">
          <p>{t('auth.pleaseLoginToAccessSettings')}</p>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: 'profile' as SettingsTab,
      label: t('tabs.profile.label'),
      icon: User,
      description: t('tabs.profile.description')
    },
    {
      id: 'password' as SettingsTab,
      label: t('tabs.password.label'),
      icon: Lock,
      description: t('tabs.password.description')
    }
  ];

  return (
    <div>
      <section className={`${theme === 'light' ? 'bg-ottoman-100' : 'bg-dark-600'} py-8 relative overflow-hidden mb-6`}>
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
            className={`text-2xl md:text-3xl font-serif font-bold text-center ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'
              } fade-bottom`}
          >
            <span>{t('pageTitle')}</span>
          </h1>
        </div>

        <p
          className={`mt-2 text-center ${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-300'
            } max-w-2xl mx-auto fade-bottom text-sm`}
        >
          {t('pageDescription')}
        </p>
      </section>

      <div className="max-w-4xl mx-auto px-4">
        {/* Tab Navigation */}
        <div className="mb-6 flex justify-center">
          <div className="flex sm:flex-row gap-1 p-1 bg-muted rounded-lg border w-max ">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 relative group",
                    "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ottoman-500",
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  <Icon 
                    className={cn(
                      "h-4 w-4 transition-colors",
                      isActive ? "text-ottoman-600" : "text-muted-foreground group-hover:text-foreground"
                    )} 
                  />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label}</span>
                  
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-md ring-1 ring-ottoman-200 dark:ring-ottoman-800" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="min-h-[300px]">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-ottoman-100 dark:bg-ottoman-900/20">
                  <User className="h-4 w-4 text-ottoman-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold"> <span> {t('profileSection.title')} </span> </h2>
                  <p className="text-xs text-muted-foreground">{t('profileSection.description')}</p>
                </div>
              </div>
              
              <div className="bg-card rounded-lg border p-4">
                <ProfileEditForm
                  profile={user}
                  onCancel={() => { }} // Empty function since ProfileEditForm handles navigation internally
                  onSaveComplete={handleSaveComplete}
                />
              </div>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-ottoman-100 dark:bg-ottoman-900/20">
                  <Lock className="h-4 w-4 text-ottoman-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold"> <span> {t('passwordSection.title')} </span> </h2>
                  <p className="text-xs text-muted-foreground">{t('passwordSection.description')}</p>
                </div>
              </div>
              
              <div className="bg-card rounded-lg border p-4">
                <ChangePassword />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
