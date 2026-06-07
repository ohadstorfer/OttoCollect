import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CreateGuideForm } from '@/components/qa/CreateGuideForm';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';

export default function CreateGuidePost() {
  const { t } = useTranslation(['qa']);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams();

  const isAdmin = user ? user.role === 'Super Admin' || !!user.role?.includes('Admin') : false;
  const tf = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  if (!user || !isAdmin) {
    return (
      <div className="container py-8">
        <div className="ottoman-card p-12 text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-serif mb-4 text-foreground">
            <span>{tf('admin.onlyTitle', 'Admins only')}</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-6">
            {tf('admin.onlyDescription', 'Only administrators can create or edit FAQ entries.')}
          </p>
          <Button onClick={() => navigate('/guide')} size="lg" className="px-8">
            {tf('backToGuide', 'Back to FAQ')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <CreateGuideForm entryId={id} />
    </div>
  );
}
