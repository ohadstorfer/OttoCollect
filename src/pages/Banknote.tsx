
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBanknoteById } from '@/services/banknoteService';
import { Banknote as BanknoteType, DetailedBanknote } from '@/types';
import { Spinner } from '@/components/ui/spinner';
import BanknoteDetailCard from '@/components/banknotes/BanknoteDetailCard';

const Banknote = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [banknote, setBanknote] = useState<DetailedBanknote | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBanknote = async () => {
      if (!id) {
        setError("Banknote ID is required");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getBanknoteById(id);
        if (!data) {
          setError("Banknote not found");
        } else {
          setBanknote(data);
        }
      } catch (err) {
        console.error("Error fetching banknote:", err);
        setError("Failed to load banknote details");
      } finally {
        setLoading(false);
      }
    };

    fetchBanknote();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !banknote) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-700">{error || "Something went wrong"}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate(-1)}
          className="mr-4 px-3 py-1 text-sm border border-ottoman-600 text-ottoman-700 rounded hover:bg-ottoman-50 transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-serif font-semibold">
          {banknote.denomination} ({banknote.country}, {banknote.year})
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <BanknoteDetailCard 
          banknote={banknote} 
          showActions={true}
        />
      </div>
    </div>
  );
};

export default Banknote;
