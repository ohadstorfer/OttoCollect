import React, { useState } from 'react';
import { Award, Book, Users, Settings } from 'lucide-react';
import CountryManagement from '@/components/admin/CountryManagement';
import BadgeAwardManager from '@/components/admin/BadgeAwardManager';

const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState('country-management');

  const renderContent = () => {
    switch (activeTab) {
      case 'country-management':
        return <CountryManagement />;
      case 'badge-awards':
        return <BadgeAwardManager />;
      default:
        return <CountryManagement />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-semibold text-gray-900">Admin Dashboard</h1>
        </div>
      </header>
      
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-md h-screen sticky top-0">
          <nav className="mt-5 px-2">
            <div className="space-y-1">
              <button
                onClick={() => setActiveTab('country-management')}
                className={`group flex items-center px-2 py-2 text-base font-medium rounded-md w-full text-left ${
                  activeTab === 'country-management'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Book className="mr-4 h-6 w-6" />
                Country Management
              </button>
              <button
                onClick={() => setActiveTab('badge-awards')}
                className={`group flex items-center px-2 py-2 text-base font-medium rounded-md w-full text-left ${
                  activeTab === 'badge-awards'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Award className="mr-4 h-6 w-6" />
                Badge Awards
              </button>
            </div>
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
