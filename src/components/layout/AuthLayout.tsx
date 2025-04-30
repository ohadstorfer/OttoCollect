
import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-ottoman-100 to-ottoman-300 dark:from-ottoman-900 dark:to-ottoman-700 p-4">
      <div className="max-w-md w-full">
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
