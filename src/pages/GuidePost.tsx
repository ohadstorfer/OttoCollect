import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RichTextContent } from '@/components/shared/RichTextContent';
import { RawHtmlFrame } from '@/components/qa/RawHtmlFrame';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/context/LanguageContext';
import { ArrowLeft, ArrowRight, Pencil, Trash2, Loader2 } from 'lucide-react';
import { fetchQaEntryByIdWithTranslations, deleteQaEntry } from '@/services/qaService';
import { getLocalizedEntry, type QaEntry } from '@/types/qa';
import SEOHead from '@/components/seo/SEOHead';

export default function GuidePost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation(['qa']);
  const { direction, currentLanguage } = useLanguage();

  const [entry, setEntry] = useState<QaEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = user ? user.role === 'Super Admin' : false;
  const tf = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchQaEntryByIdWithTranslations(id, currentLanguage)
      .then(setEntry)
      .finally(() => setLoading(false));
  }, [id, currentLanguage]);

  const handleDelete = async () => {
    if (!entry) return;
    if (!window.confirm(tf('status.deleteConfirm', 'Delete this question permanently?'))) return;
    setDeleting(true);
    const ok = await deleteQaEntry(entry.id);
    setDeleting(false);
    if (ok) {
      toast({ title: tf('actions.delete', 'Deleted') });
      navigate('/guide');
    } else {
      toast({ variant: 'destructive', title: tf('errors.saveFailed', 'Error') });
    }
  };

  if (loading) {
    return <div className="container py-12 text-center">{tf('status.loading', 'Loading...')}</div>;
  }
  if (!entry) {
    return (
      <div className="container py-12 text-center">
        <p className="mb-4">{tf('errors.loadFailed', 'Could not load the FAQ.')}</p>
        <Button onClick={() => navigate('/guide')}>{tf('backToGuide', 'Back to FAQ')}</Button>
      </div>
    );
  }

  const localized = getLocalizedEntry(entry, currentLanguage);

  const seo = (
    <SEOHead
      title={`${localized.headline} | OttoCollect`}
      description={localized.shortDescription}
      type="article"
      canonical={`https://ottocollect.com/guide-post/${entry.id}`}
    />
  );

  const toolbar = (
    <div className="mb-6 flex items-center justify-between gap-2">
      <Button variant="ghost" onClick={() => navigate('/guide')} className="flex items-center">
        {direction === 'rtl' ? <ArrowRight className="mr-2 h-4 w-4" /> : <ArrowLeft className="mr-2 h-4 w-4" />}
        {tf('backToGuide', 'Back to FAQ')}
      </Button>
      {isAdmin && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/create-guide-post/${entry.id}`)}>
            <Pencil className="h-4 w-4 mr-1" />{tf('actions.edit', 'Edit')}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      )}
    </div>
  );

  // Raw-HTML entries are standalone, full-page documents: render the iframe at
  // full width so the uploaded design isn't squeezed into the article column.
  // Only the toolbar stays in the centered column.
  if (entry.contentIsRaw) {
    return (
      <div className="py-8">
        {seo}
        <div className="container max-w-3xl mx-auto px-4">{toolbar}</div>
        <RawHtmlFrame html={localized.content} title={localized.headline} />
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-3xl mx-auto">
      {seo}
      {toolbar}

      {entry.mainImageUrl && (
        <img src={entry.mainImageUrl} alt="" className="w-full rounded-lg mb-6 object-cover" />
      )}

      <div
        dir={direction === 'rtl' ? 'rtl' : 'ltr'}
        className={direction === 'rtl' ? 'text-right' : 'text-left'}
      >
        <h1 className="text-3xl font-serif font-bold mb-6 text-foreground">
          <span>{localized.headline}</span>
        </h1>

        <RichTextContent content={localized.content} className="prose max-w-none" />
      </div>
    </div>
  );
}
