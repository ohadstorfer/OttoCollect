
import React from 'react';

const Home = () => {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Welcome to Banknote Collector</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-card p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-3">Browse Catalog</h2>
          <p className="text-muted-foreground mb-4">
            Explore our comprehensive catalog of banknotes from around the world.
          </p>
          <a href="/catalog" className="text-primary hover:underline">View Catalog →</a>
        </div>
        <div className="bg-card p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-3">Manage Collection</h2>
          <p className="text-muted-foreground mb-4">
            Keep track of your personal collection and share it with others.
          </p>
          <a href="/my-collection" className="text-primary hover:underline">View My Collection →</a>
        </div>
      </div>
    </div>
  );
};

export default Home;
