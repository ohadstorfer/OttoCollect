
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { useAuth } from '@/context/AuthContext';
import LatestForumPosts from '@/components/home/LatestForumPosts';
import MarketplaceHighlights from '@/components/home/MarketplaceHighlights';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="home-page">
      <div className="hero bg-ottoman-900 text-white py-16">
        <Container className="text-center">
          <h1 className="text-4xl font-bold mb-4">Welcome to Ottoman Banknotes</h1>
          <p className="text-xl mb-8">
            Explore, collect, and trade historical Ottoman Empire banknotes
          </p>
          <div className="flex justify-center gap-4">
            <Button
              onClick={() => navigate('/catalog')}
              size="lg"
              className="bg-ottoman-500 hover:bg-ottoman-600"
            >
              Browse Catalog
            </Button>
            {!user && (
              <Button
                onClick={() => navigate('/auth')}
                variant="outline"
                size="lg"
                className="border-white text-white hover:bg-white/10"
              >
                Sign Up
              </Button>
            )}
          </div>
        </Container>
      </div>

      <Container className="py-12">
        <div className="grid md:grid-cols-2 gap-8">
          <MarketplaceHighlights />
          <LatestForumPosts />
        </div>
      </Container>
    </div>
  );
};

export default Index;
