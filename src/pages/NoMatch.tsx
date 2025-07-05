import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const NoMatch: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="page-container flex items-center justify-center min-h-[70vh]">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-ottoman-600 mb-4"><span>404</span></h1>
        <h2 className="text-2xl font-medium mb-6"><span>Page Not Found</span></h2>
        <p className="text-muted-foreground mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={() => navigate(-1)}>
            Go Back
          </Button>
          <Button variant="outline" onClick={() => navigate('/')}>
            Return Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NoMatch;
