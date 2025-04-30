
import React from 'react';
import { Link } from 'react-router-dom';

const NoMatch = () => {
  return (
    <div className="container mx-auto p-6 text-center">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-xl mb-6">Page not found</p>
      <p className="mb-6">The page you are looking for might have been removed or is temporarily unavailable.</p>
      <Link to="/" className="text-primary hover:underline">
        Return to Home
      </Link>
    </div>
  );
};

export default NoMatch;
