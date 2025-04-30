
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import NoMatch from './pages/NoMatch';
import Auth from './pages/Auth';
import AuthLayout from './components/layout/AuthLayout';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import Catalog from './pages/Catalog';
import CountryDetail from './pages/CountryDetail';
import BanknoteDetail from './pages/BanknoteDetail';
import CollectionLanding from './pages/CollectionLanding';
import CollectionCountry from './pages/CollectionCountry';
import PublicCollectionLanding from './pages/PublicCollectionLanding';
import PublicCollectionCountry from './pages/PublicCollectionCountry';
import Settings from './pages/Settings';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/auth" element={<AuthLayout><Auth /></AuthLayout>} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="catalog" element={<Catalog />} />
              <Route path="catalog/:countryName" element={<CountryDetail />} />
              <Route path="banknote-details/:id" element={<BanknoteDetail />} />
              <Route path="my-collection" element={<CollectionLanding />} />
              <Route path="my-collection/country/:countryId" element={<CollectionCountry />} />
              <Route path="profile/:userId/collection" element={<PublicCollectionLanding />} />
              <Route path="profile/:userId/collection/country/:countryId" element={<PublicCollectionCountry />} />
              <Route path="profile/:id" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="admin/*" element={<Admin />} />
              <Route path="*" element={<NoMatch />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
