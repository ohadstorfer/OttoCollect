import React from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import Banknotes from './pages/Banknotes';
import BanknoteDetail from './pages/BanknoteDetail';
import Countries from './pages/Countries';
import CountryDetail from './pages/CountryDetail';
import Collection from './pages/Collection';
import Forum from './pages/Forum';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import { Toaster } from '@/components/ui/toaster';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { fetchUser } from '@/services/userService';
import { CountryDetailCollection } from './pages/CountryDetailCollection';

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

const AppContent: React.FC = () => {
  const { user, setUser, setIsInitialized } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          const fetchedUser = await fetchUser(parsedUser.id);

          if (fetchedUser) {
            setUser(fetchedUser);
          } else {
            localStorage.removeItem('user');
            setUser(null);
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, [setUser, setIsInitialized]);

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/banknotes" element={<Banknotes />} />
        <Route path="/banknotes/:id" element={<BanknoteDetail />} />
        <Route path="/countries" element={<Countries />} />
        <Route path="/countries/:id" element={<CountryDetail />} />
        <Route path="/collection" element={<Collection />} />
        <Route path="/forum" element={<Forum />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
        <Route 
            path="/country/:countryId/collection" 
            element={<CountryDetailCollection onBackToCountries={() => navigate('/countries')} />} 
          />
      </Routes>
      <Toaster />
    </>
  );
};

export default App;
